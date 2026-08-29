"""
Image -> MusicXML -> MIDI -> WAV pipeline.

Per-system processing
---------------------
Images are first segmented into individual staff-system strips using a
horizontal-projection profile.  Each strip is enhanced independently
(upscale, CLAHE, sharpen, denoise) and then passed to Audiveris.  The
resulting per-system MXL files are merged back into one coherent score
before the MIDI and audio steps run.

This avoids giving Audiveris a large full-page image (slow, OOM-prone on
Render's free tier) and makes the pipeline crash-resilient: a checkpoint
file records which systems have already been recognised so that a server
restart resumes from where it left off instead of starting over.

PDFs are handled by the original flow (Audiveris reads PDFs natively after
quality enhancement of the whole file).
"""

from __future__ import annotations

import gc
import json
import os
import shutil
import time
import traceback
from pathlib import Path

from music21 import converter, tempo as m21_tempo

from merge_musicxml import merge_system_mxls
from segment_systems import segment_and_enhance

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------

def _mem_mb() -> str:
    """Return current RSS memory in MB, or '?' if psutil/proc unavailable."""
    # Try psutil first (available on many platforms)
    try:
        import psutil
        proc = psutil.Process(os.getpid())
        rss = proc.memory_info().rss / (1024 * 1024)
        return f"{rss:.1f} MB"
    except Exception:
        pass
    # Linux fallback: read /proc/self/status
    try:
        with open("/proc/self/status") as fh:
            for line in fh:
                if line.startswith("VmRSS:"):
                    kb = int(line.split()[1])
                    return f"{kb / 1024:.1f} MB"
    except Exception:
        pass
    return "? MB"


def _log(tag: str, msg: str) -> None:
    """Emit a timestamped log line that is always visible in Render logs."""
    ts = time.strftime("%H:%M:%S")
    mem = _mem_mb()
    print(f"[{ts}][{mem}][{tag}] {msg}", flush=True)

# ---------------------------------------------------------------------------
# Configurable paths (override via env vars for Docker / Render)
# ---------------------------------------------------------------------------

AUDIVERIS_PATH = os.getenv(
    "AUDIVERIS_PATH",
    r"C:\Program Files\Audiveris\Audiveris.exe",
)
FLUIDSYNTH_PATH = os.getenv(
    "FLUIDSYNTH_PATH",
    r"C:\tools\fluidsynth\bin\fluidsynth.exe",
)
SOUNDFONT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "soundfonts",
    "GeneralUser-GS.sf2",
)

_PDF_EXTENSIONS = {".pdf"}
_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp", ".gif"}

_DEFAULT_BPM = 120


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _friendly_audiveris_error(log: str) -> str | None:
    if "Could not export since transcription did not complete successfully" in log:
        return (
            "Could not read sheet music from this image. Use a clear, straight photo or scan "
            "of printed notation with good lighting."
        )
    if "flagged as invalid" in log:
        return (
            "The uploaded image does not look like readable sheet music. Try a clearer photo "
            "with the full staff visible."
        )
    return None


def _run_subprocess(label: str, command: list[str]) -> None:
    import subprocess

    exe = command[0]
    if exe and Path(exe).is_absolute() and not Path(exe).exists():
        raise RuntimeError(f"{label} not found at {exe}")

    _log(label, f"Running: {' '.join(str(c) for c in command[:4])}… (mem before: {_mem_mb()})")
    t0 = time.time()
    result = subprocess.run(command, capture_output=True, text=True)
    elapsed = time.time() - t0
    _log(label, f"Exit code {result.returncode} in {elapsed:.1f}s (mem after: {_mem_mb()})")
    if result.returncode != 0:
        combined = f"{result.stderr or ''}\n{result.stdout or ''}".strip()
        _log(label, f"FAILED output (first 600 chars):\n{combined[:600]}")
        if label.startswith("Audiveris"):
            friendly = _friendly_audiveris_error(combined)
            if friendly:
                raise RuntimeError(friendly)
        raise RuntimeError(f"{label} failed: {(combined or 'Unknown error')[:500]}")
    else:
        if result.stdout:
            _log(label, f"stdout (first 300 chars): {result.stdout[:300]}")


def _audiveris_cmd(image_path: str, out_dir: str) -> list[str]:
    cmd = [AUDIVERIS_PATH, "-batch", "-export", "-output", out_dir, image_path]
    if os.name != "nt":
        cmd = ["xvfb-run", "-a", "--server-args=-screen 0 640x480x8"] + cmd
    return cmd


def _ocr_strip(image_path: Path) -> str:
    """
    Try to extract text from a non-music image strip using pytesseract.
    Returns an empty string if pytesseract is unavailable or OCR fails.
    """
    try:
        import pytesseract  # type: ignore
        from PIL import Image as _PIL_Image
        img = _PIL_Image.open(image_path)
        # --psm 6: assume a single uniform block of text (suitable for title/
        # composer lines which typically span the full width of the page).
        raw = pytesseract.image_to_string(img, config="--psm 6").strip()
        # Collapse newlines and multiple spaces into a single space so we get
        # a clean one-liner.
        return " ".join(raw.split())
    except ImportError:
        return ""
    except Exception:
        return ""


def _patch_mxl_metadata(mxl_path: str, *, title: str, composer: str) -> None:
    """Re-parse a single-system MXL and write back with updated metadata."""
    if not title and not composer:
        return
    try:
        from merge_musicxml import _apply_metadata
        score = converter.parse(mxl_path)
        _apply_metadata(score, title, composer)
        score.write("musicxml", fp=mxl_path)
    except Exception as exc:
        print(f"[pipeline] Metadata patch failed ({exc}); continuing without title fix.")


def _run_audiveris_on_image(image_path: str, out_dir: str, label: str) -> Path:
    """Run Audiveris on one image; return the path to the produced MXL."""
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    _run_subprocess(label, _audiveris_cmd(image_path, out_dir))

    stem = Path(image_path).stem
    candidates = list(Path(out_dir).glob("**/*.mxl"))
    if not candidates:
        raise RuntimeError(f"Audiveris produced no MXL output for {label}.")
    for c in candidates:
        if c.stem == stem:
            return c
    return candidates[0]


# -- Status file helpers -----------------------------------------------------

def _set_status(
    output_dir: str,
    step: str,
    status: str,
    error: str | None = None,
    extra: dict | None = None,
) -> None:
    status_path = Path(output_dir) / "status.json"
    if not status_path.exists():
        return
    try:
        with open(status_path) as f:
            data = json.load(f)
    except Exception:
        return

    if step in data["steps"]:
        data["steps"][step] = status

    if status == "failed":
        data["status"] = "failed"
        data["error"] = error
    elif all(v == "completed" for v in data["steps"].values()):
        data["status"] = "completed"

    if extra:
        data.update(extra)

    try:
        with open(status_path, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


# -- Checkpoint helpers -------------------------------------------------------

def _load_checkpoint(path: Path) -> dict:
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            pass
    return {"completed_indices": [], "mxl_paths": []}


def _save_checkpoint(path: Path, data: dict) -> None:
    try:
        with open(path, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# PDF path  (original single-image approach -- Audiveris handles PDFs natively)
# ---------------------------------------------------------------------------

def _process_pdf(image_path: str, output_dir: str, base_name: str) -> Path:
    """Enhance the full PDF and run Audiveris on it, returning the MXL path."""
    from enhance_quality import process_file

    image_path_obj = Path(image_path)
    enhanced_path = process_file(image_path_obj, force=True)
    actual_path = str(enhanced_path) if enhanced_path else image_path

    output_dir_path = Path(output_dir)
    mxl_out_dir = output_dir_path / "audiveris_pdf_out"
    mxl_path = _run_audiveris_on_image(actual_path, str(mxl_out_dir), "Audiveris[PDF]")

    final_mxl = output_dir_path / f"{base_name}.mxl"
    shutil.copy2(str(mxl_path), str(final_mxl))
    shutil.rmtree(str(mxl_out_dir), ignore_errors=True)
    if enhanced_path and Path(actual_path).exists():
        try:
            Path(actual_path).unlink()
        except Exception:
            pass
    return final_mxl


# ---------------------------------------------------------------------------
# Image path  (new per-system approach)
# ---------------------------------------------------------------------------

def _process_image_per_system(image_path: str, output_dir: str, base_name: str) -> Path:
    """
    Segment the image into staff-system strips, enhance each strip, run
    Audiveris per strip (with checkpoint/resume), then merge all MXL outputs.
    Returns the path to the final merged MXL file.
    """
    output_dir_path = Path(output_dir)

    # 1. Segment + enhance each system strip
    strips_dir = output_dir_path / "strips"
    _log("segment", f"Segmenting {image_path}  mem={_mem_mb()}")
    t0_seg = time.time()
    strips = segment_and_enhance(image_path, str(strips_dir))
    total = len(strips)
    _log("segment", f"{total} strip(s) ready  elapsed={time.time()-t0_seg:.1f}s  mem={_mem_mb()}")

    # 2. Run Audiveris per strip, resuming from checkpoint if available
    checkpoint_path = output_dir_path / "checkpoint.json"
    checkpoint = _load_checkpoint(checkpoint_path)

    # mxl_by_index holds the stable MXL path for each system index
    mxl_by_index: dict[int, str] = dict(
        zip(checkpoint["completed_indices"], checkpoint["mxl_paths"])
    )

    skipped: list[int] = []
    # Text extracted by OCR from non-music strips (title, composer/arranger).
    # First OCR'd line -> title, second -> composer.
    skipped_texts: list[str] = []

    for strip in strips:
        idx = strip.index

        if idx in mxl_by_index:
            _log("omr", f"System {idx + 1}/{total}: checkpoint hit — skip.")
            continue

        _set_status(output_dir, "omr", "processing", extra={
            "omr_progress": {"current": idx + 1, "total": total},
        })
        _log("omr", f"System {idx + 1}/{total}: starting Audiveris  mem={_mem_mb()}")

        strip_out_dir = output_dir_path / f"audiveris_out_{idx:03d}"
        try:
            mxl_raw = _run_audiveris_on_image(
                str(strip.path),
                str(strip_out_dir),
                label=f"Audiveris[system {idx + 1}/{total}]",
            )
        except RuntimeError as err:
            # This strip is not recognisable as music (likely a title, header,
            # page number, or decorative element).  OCR it so we can use the
            # text as the score title / composer in the merged output.
            print(f"[pipeline] System {idx + 1}/{total} skipped (not music): {err}")
            skipped.append(idx)
            ocr_text = _ocr_strip(strip.path)
            if ocr_text:
                print(f"[pipeline] OCR from skipped strip {idx}: {ocr_text!r}")
                skipped_texts.append(ocr_text)
            shutil.rmtree(str(strip_out_dir), ignore_errors=True)
            # Free the skipped strip image immediately
            try:
                strip.path.unlink(missing_ok=True)
            except Exception:
                pass
            continue

        # Copy MXL to a stable location outside the Audiveris output dir
        stable_mxl = output_dir_path / f"system_{idx:03d}.mxl"
        shutil.copy2(str(mxl_raw), str(stable_mxl))
        mxl_by_index[idx] = str(stable_mxl)

        # Persist checkpoint immediately so a restart can skip this system
        checkpoint["completed_indices"].append(idx)
        checkpoint["mxl_paths"].append(str(stable_mxl))
        _save_checkpoint(checkpoint_path, checkpoint)

        # Remove Audiveris scratch dir to free disk space
        shutil.rmtree(str(strip_out_dir), ignore_errors=True)
        # Delete the strip image immediately — it has been processed and is no
        # longer needed.  This frees significant disk space on Render's free tier
        # and reduces peak memory held by the file system cache.
        try:
            strip.path.unlink(missing_ok=True)
        except Exception:
            pass

    # If every strip was skipped, nothing is recoverable
    if not mxl_by_index:
        _log("omr", "ERROR: no staff systems recognised — all strips failed or skipped")
        raise RuntimeError(
            "Audiveris could not recognise any staff systems in the uploaded image. "
            "Check that the image contains clear, printed sheet music with full staves visible."
        )

    if skipped:
        print(f"[pipeline] Skipped {len(skipped)} non-music strip(s): indices {skipped}")

    # 3. Merge all per-system MXLs into one score
    ordered_mxl_paths = [mxl_by_index[i] for i in sorted(mxl_by_index)]
    final_mxl = output_dir_path / f"{base_name}.mxl"

    # Title / composer: prefer OCR from non-music strips; fall back to filename.
    score_title    = skipped_texts[0] if len(skipped_texts) > 0 else ""
    score_composer = skipped_texts[1] if len(skipped_texts) > 1 else ""

    _log("merge", f"Merging {len(ordered_mxl_paths)} system MXL file(s)  mem={_mem_mb()}")
    if len(ordered_mxl_paths) == 1:
        shutil.copy2(ordered_mxl_paths[0], str(final_mxl))
        _patch_mxl_metadata(str(final_mxl), title=score_title, composer=score_composer)
        _log("merge", "Single system — no merge needed.")
    else:
        _log("merge", f"Multi-system merge: {ordered_mxl_paths}")
        try:
            t0_merge = time.time()
            merged_score = merge_system_mxls(
                ordered_mxl_paths,
                title=score_title,
                composer=score_composer,
            )
            _log("merge", f"merge_system_mxls done  elapsed={time.time()-t0_merge:.1f}s  mem={_mem_mb()}")
        except Exception:
            _log("merge", f"merge_system_mxls FAILED:\n{traceback.format_exc()}")
            raise
        try:
            merged_score.write("musicxml", fp=str(final_mxl))
            _log("merge", f"merged MXL written  size={final_mxl.stat().st_size if final_mxl.exists() else '?'} bytes  mem={_mem_mb()}")
        except ZeroDivisionError:
            # Rare: a malformed TS that survived the merge loop can still trigger
            # a division by zero when music21 serialises offsets.  Retry after
            # inserting a safe 4/4 time signature at the top of every part.
            _log("merge", "merged_score.write raised ZeroDivisionError; inserting 4/4 fallback into all parts and retrying.")
            from music21 import meter as _m21_meter
            for _p in merged_score.parts:
                _p.insert(0, _m21_meter.TimeSignature("4/4"))
            merged_score.write("musicxml", fp=str(final_mxl))
            _log("merge", f"Retry succeeded  size={final_mxl.stat().st_size if final_mxl.exists() else '?'} bytes")
        except Exception as write_exc:
            _log("merge", f"merged_score.write FAILED  type={type(write_exc).__name__}:\n{traceback.format_exc()}")
            raise
        del merged_score
        gc.collect()

    # 4. Cleanup intermediate files
    shutil.rmtree(str(strips_dir), ignore_errors=True)
    for mxl_p in mxl_by_index.values():
        try:
            Path(mxl_p).unlink(missing_ok=True)
        except Exception:
            pass
    try:
        checkpoint_path.unlink(missing_ok=True)
    except Exception:
        pass

    return final_mxl


# ---------------------------------------------------------------------------
# Tempo helpers (shared between PDF and image paths)
# ---------------------------------------------------------------------------

def _fix_tempos(score) -> int:
    """
    Ensure every MetronomeMark in the score has a valid (> 0) BPM.
    Returns the effective BPM used for audio synthesis.

    Important: convert the StreamIterator to a concrete list immediately.
    A StreamIterator is logically re-iterable but its __bool__ check can
    return False after the iterator has been advanced, causing the "insert
    if empty" branch to fire even when marks exist — leaving the original
    zero-BPM mark in place and ultimately triggering a ZeroDivisionError
    inside music21's MIDI writer.
    """
    marks = list(score.flatten().getElementsByClass(m21_tempo.MetronomeMark))

    # Find the first valid tempo
    effective_bpm = _DEFAULT_BPM
    for tm in marks:
        if tm.number and tm.number > 0:
            effective_bpm = int(tm.number)
            break

    # Fix every zero/invalid mark (mid-score changes included)
    for tm in marks:
        if not tm.number or tm.number <= 0:
            tm.number = effective_bpm

    # Insert a tempo mark if the score has none at all
    if not marks:
        score.insert(0, m21_tempo.MetronomeMark(number=effective_bpm))

    return effective_bpm


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def process_image_to_audio(image_path: str, output_dir: str, base_name: str) -> dict:
    """
    Full pipeline: image/PDF -> MXL -> MIDI -> WAV + analysis report.

    Parameters
    ----------
    image_path : path to the uploaded sheet music file.
    output_dir : directory where all outputs are written.
    base_name  : stem used for output filenames (e.g. ``my_score``).

    Returns
    -------
    dict with keys ``musicxml_path``, ``midi_path``, ``audio_path``.
    """
    output_dir_path = Path(output_dir)
    current_step = "omr"
    pipeline_start = time.time()
    _log("pipeline", f"START  job={base_name}  file={image_path}  mem={_mem_mb()}")

    try:
        _set_status(output_dir, "omr", "processing")

        # -- OMR step --------------------------------------------------------
        suffix = Path(image_path).suffix.lower()
        _log("pipeline", f"OMR step beginning  suffix={suffix}  mem={_mem_mb()}")

        if suffix in _PDF_EXTENSIONS:
            final_mxl = _process_pdf(image_path, output_dir, base_name)
        elif suffix in _IMAGE_EXTENSIONS:
            final_mxl = _process_image_per_system(image_path, output_dir, base_name)
        else:
            raise RuntimeError(
                f"Unsupported file type '{suffix}'. "
                "Upload a PNG, JPG, TIFF, or PDF of printed sheet music."
            )

        if not final_mxl.exists():
            raise RuntimeError("Pipeline produced no MusicXML output.")

        _set_status(output_dir, "omr", "completed")
        _log("pipeline", f"OMR completed  mxl={final_mxl}  mem={_mem_mb()}")

        # -- MusicXML verification -------------------------------------------
        current_step = "musicxml"
        _set_status(output_dir, "musicxml", "processing")
        _set_status(output_dir, "musicxml", "completed")

        # -- MXL -> MIDI -----------------------------------------------------
        current_step = "midi"
        _set_status(output_dir, "midi", "processing")

        output_midi = output_dir_path / f"{base_name}.mid"
        _log("pipeline", f"MIDI step beginning  mxl_size={final_mxl.stat().st_size if final_mxl.exists() else 'missing'} bytes  mem={_mem_mb()}")
        score = converter.parse(str(final_mxl))
        _log("pipeline", f"MXL parsed  parts={len(score.parts)}  mem={_mem_mb()}")
        try:
            effective_bpm = _fix_tempos(score)
        except Exception:
            _log("pipeline", f"_fix_tempos raised (using default):\n{traceback.format_exc()}")
            effective_bpm = _DEFAULT_BPM
            score.insert(0, m21_tempo.MetronomeMark(number=effective_bpm))
        _log("pipeline", f"Effective BPM: {effective_bpm}  mem={_mem_mb()}")

        # Expand repeat barlines so the MIDI contains the full playback,
        # including every repeated section.  Falls back to the unexpanded
        # score if the repeat structure is malformed (e.g. mismatched barlines
        # from imperfect OMR output).
        try:
            score = score.expandRepeats()
            # Re-fix tempos after expansion (expanded copy is a new object).
            _fix_tempos(score)
            _log("pipeline", f"expandRepeats() done  mem={_mem_mb()}")
        except Exception as _rep_err:
            _log("pipeline", f"expandRepeats() skipped ({_rep_err}), using unexpanded score.")

        _log("pipeline", f"Writing MIDI to {output_midi}  mem={_mem_mb()}")
        try:
            score.write("midi", fp=str(output_midi))
        except ZeroDivisionError:
            # music21's MIDI writer divides by tempo; a residual 0-BPM mark
            # can escape _fix_tempos (e.g. nested inside a container).
            # Hard-insert a 120-BPM mark at offset 0 and retry once.
            _log("pipeline", "MIDI write hit ZeroDivisionError; inserting fallback tempo and retrying.")
            score.insert(0, m21_tempo.MetronomeMark(number=_DEFAULT_BPM))
            score.write("midi", fp=str(output_midi))
        except Exception as midi_exc:
            _log("pipeline", f"MIDI write FAILED with {type(midi_exc).__name__}: {midi_exc}\n{traceback.format_exc()}")
            raise
        del score
        gc.collect()

        if not output_midi.exists():
            raise RuntimeError("Failed to convert MusicXML to MIDI.")

        _log("pipeline", f"MIDI written  size={output_midi.stat().st_size} bytes  mem={_mem_mb()}")
        _set_status(output_dir, "midi", "completed")

        # -- MIDI -> WAV -----------------------------------------------------
        current_step = "audio"
        _set_status(output_dir, "audio", "processing")

        output_audio = output_dir_path / f"{base_name}.wav"
        _log("pipeline", f"FluidSynth step beginning  midi={output_midi}  soundfont={SOUNDFONT}  mem={_mem_mb()}")
        _run_subprocess("FluidSynth", [
            FLUIDSYNTH_PATH, "-ni",
            "-F", str(output_audio),
            "-r", "44100",
            SOUNDFONT,
            str(output_midi),
        ])

        if not output_audio.exists():
            raise RuntimeError("Failed to synthesize audio from MIDI.")

        _log("pipeline", f"Audio written  size={output_audio.stat().st_size} bytes  mem={_mem_mb()}")
        _set_status(output_dir, "audio", "completed")

        # -- Analysis --------------------------------------------------------
        current_step = "analysis"
        _set_status(output_dir, "analysis", "processing")
        _log("pipeline", f"Analysis step beginning  mem={_mem_mb()}")

        try:
            from music.analysis import analyze_score
            report = analyze_score(str(final_mxl))
            if isinstance(report, dict):
                mi = report.setdefault("musicalInfo", {})
                if not isinstance(mi, dict):
                    mi = {}
                    report["musicalInfo"] = mi
                try:
                    _parsed_bpm = float(str(mi.get("tempo", "")).split()[0])
                except (ValueError, IndexError):
                    _parsed_bpm = 0
                if _parsed_bpm <= 0:
                    mi["tempo"] = f"{effective_bpm} bpm"
            report_path = output_dir_path / "analysis_report.json"
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
        except Exception as ae:
            print(f"[pipeline] Analysis failed: {ae}")
            report_path = output_dir_path / "analysis_report.json"
            try:
                with open(report_path, "w", encoding="utf-8") as f:
                    json.dump({
                        "error": str(ae),
                        "musicalInfo": {"tempo": f"{effective_bpm} bpm"},
                    }, f)
            except Exception:
                pass

        _set_status(output_dir, "analysis", "completed")

        elapsed_total = time.time() - pipeline_start
        _log("pipeline", f"COMPLETE  elapsed={elapsed_total:.1f}s  mem={_mem_mb()}")
        return {
            "musicxml_path": str(final_mxl),
            "midi_path": str(output_midi),
            "audio_path": str(output_audio),
        }

    except Exception as exc:
        elapsed_total = time.time() - pipeline_start
        _log("pipeline", (
            f"FAILED at step={current_step}  elapsed={elapsed_total:.1f}s  mem={_mem_mb()}\n"
            f"  error_type={type(exc).__name__}\n"
            f"  error_msg={exc}\n"
            f"{traceback.format_exc()}"
        ))
        _set_status(output_dir, current_step, "failed", str(exc))
        raise

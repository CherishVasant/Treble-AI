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
from pathlib import Path

from music21 import converter, tempo as m21_tempo

from merge_musicxml import merge_system_mxls
from segment_systems import segment_and_enhance

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

    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        combined = f"{result.stderr or ''}\n{result.stdout or ''}".strip()
        if label.startswith("Audiveris"):
            friendly = _friendly_audiveris_error(combined)
            if friendly:
                raise RuntimeError(friendly)
        raise RuntimeError(f"{label} failed: {(combined or 'Unknown error')[:500]}")


def _audiveris_cmd(image_path: str, out_dir: str) -> list[str]:
    cmd = [AUDIVERIS_PATH, "-batch", "-export", "-output", out_dir, image_path]
    if os.name != "nt":
        cmd = ["xvfb-run", "-a", "--server-args=-screen 0 640x480x8"] + cmd
    return cmd


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
    strips = segment_and_enhance(image_path, str(strips_dir))
    total = len(strips)
    print(f"[pipeline] {total} system strip(s) ready for Audiveris.")

    # 2. Run Audiveris per strip, resuming from checkpoint if available
    checkpoint_path = output_dir_path / "checkpoint.json"
    checkpoint = _load_checkpoint(checkpoint_path)

    # mxl_by_index holds the stable MXL path for each system index
    mxl_by_index: dict[int, str] = dict(
        zip(checkpoint["completed_indices"], checkpoint["mxl_paths"])
    )

    skipped: list[int] = []

    for strip in strips:
        idx = strip.index

        if idx in mxl_by_index:
            print(f"[pipeline] System {idx + 1}/{total}: already recognised (checkpoint) -- skip.")
            continue

        _set_status(output_dir, "omr", "processing", extra={
            "omr_progress": {"current": idx + 1, "total": total},
        })
        print(f"[pipeline] Audiveris -> system {idx + 1}/{total}...")

        strip_out_dir = output_dir_path / f"audiveris_out_{idx:03d}"
        try:
            mxl_raw = _run_audiveris_on_image(
                str(strip.path),
                str(strip_out_dir),
                label=f"Audiveris[system {idx + 1}/{total}]",
            )
        except RuntimeError as err:
            # This strip is not recognisable as music (likely a title, header,
            # page number, or decorative element).  Log and skip -- do not abort
            # the whole job unless no music strips succeed at all.
            print(f"[pipeline] System {idx + 1}/{total} skipped (not music): {err}")
            skipped.append(idx)
            shutil.rmtree(str(strip_out_dir), ignore_errors=True)
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

    # If every strip was skipped, nothing is recoverable
    if not mxl_by_index:
        raise RuntimeError(
            "Audiveris could not recognise any staff systems in the uploaded image. "
            "Check that the image contains clear, printed sheet music with full staves visible."
        )

    if skipped:
        print(f"[pipeline] Skipped {len(skipped)} non-music strip(s): indices {skipped}")

    # 3. Merge all per-system MXLs into one score
    ordered_mxl_paths = [mxl_by_index[i] for i in sorted(mxl_by_index)]
    final_mxl = output_dir_path / f"{base_name}.mxl"

    if len(ordered_mxl_paths) == 1:
        shutil.copy2(ordered_mxl_paths[0], str(final_mxl))
        print("[pipeline] Single system -- no merge needed.")
    else:
        print(f"[pipeline] Merging {len(ordered_mxl_paths)} system MXL files...")
        merged_score = merge_system_mxls(ordered_mxl_paths)
        merged_score.write("musicxml", fp=str(final_mxl))
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
    """
    marks = score.flatten().getElementsByClass(m21_tempo.MetronomeMark)

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

    try:
        _set_status(output_dir, "omr", "processing")

        # -- OMR step --------------------------------------------------------
        suffix = Path(image_path).suffix.lower()

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

        # -- MusicXML verification -------------------------------------------
        current_step = "musicxml"
        _set_status(output_dir, "musicxml", "processing")
        _set_status(output_dir, "musicxml", "completed")

        # -- MXL -> MIDI -----------------------------------------------------
        current_step = "midi"
        _set_status(output_dir, "midi", "processing")

        output_midi = output_dir_path / f"{base_name}.mid"
        score = converter.parse(str(final_mxl))
        effective_bpm = _fix_tempos(score)

        # Expand repeat barlines so the MIDI contains the full playback,
        # including every repeated section.  Falls back to the unexpanded
        # score if the repeat structure is malformed (e.g. mismatched barlines
        # from imperfect OMR output).
        try:
            score = score.expandRepeats()
            # Re-fix tempos after expansion (expanded copy is a new object).
            _fix_tempos(score)
        except Exception as _rep_err:
            print(f"[pipeline] expandRepeats() skipped ({_rep_err}), using unexpanded score.")

        score.write("midi", fp=str(output_midi))
        del score
        gc.collect()

        if not output_midi.exists():
            raise RuntimeError("Failed to convert MusicXML to MIDI.")

        _set_status(output_dir, "midi", "completed")

        # -- MIDI -> WAV -----------------------------------------------------
        current_step = "audio"
        _set_status(output_dir, "audio", "processing")

        output_audio = output_dir_path / f"{base_name}.wav"
        _run_subprocess("FluidSynth", [
            FLUIDSYNTH_PATH, "-ni",
            "-F", str(output_audio),
            "-r", "44100",
            SOUNDFONT,
            str(output_midi),
        ])

        if not output_audio.exists():
            raise RuntimeError("Failed to synthesize audio from MIDI.")

        _set_status(output_dir, "audio", "completed")

        # -- Analysis --------------------------------------------------------
        current_step = "analysis"
        _set_status(output_dir, "analysis", "processing")

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

        return {
            "musicxml_path": str(final_mxl),
            "midi_path": str(output_midi),
            "audio_path": str(output_audio),
        }

    except Exception as exc:
        _set_status(output_dir, current_step, "failed", str(exc))
        raise

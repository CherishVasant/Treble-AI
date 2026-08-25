from music21 import converter
from pathlib import Path
import subprocess
import shutil
from enhance_quality import process_file


import os

# Both paths are overridable via environment variables so the same code runs on
# Windows (local dev) and Linux (Docker / production) without changes.
#   Windows default: C:\Program Files\Audiveris\Audiveris.exe
#   Linux/Docker:    /opt/audiveris/bin/Audiveris  (set via AUDIVERIS_PATH env var)
AUDIVERIS_PATH = os.getenv(
    "AUDIVERIS_PATH",
    r"C:\Program Files\Audiveris\Audiveris.exe"
)
# FluidSynth is on PATH after `apt-get install fluidsynth` in Docker,
# so the default below works on Linux without setting the env var.
FLUIDSYNTH_PATH = os.getenv(
    "FLUIDSYNTH_PATH",
    r"C:\tools\fluidsynth\bin\fluidsynth.exe"
)
SOUNDFONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "soundfonts", "GeneralUser-GS.sf2")


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


def _run_step(label: str, command: list[str]) -> None:
    exe = command[0]
    # Only check file existence when the path is absolute.
    # When it's just a name (e.g. "Audiveris" on PATH after .deb install),
    # skip the existence check and let subprocess raise if it's missing.
    if exe and Path(exe).is_absolute() and not Path(exe).exists():
        raise RuntimeError(f"{label} not found at {exe}")

    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        combined = f"{result.stderr or ''}\n{result.stdout or ''}".strip()
        if label == "Audiveris":
            friendly = _friendly_audiveris_error(combined)
            if friendly:
                raise RuntimeError(friendly)
        detail = combined or "Unknown error"
        raise RuntimeError(f"{label} failed: {detail[:500]}")


import json

def _set_status(output_dir: str, step: str, status: str, error: str = None):
    status_path = Path(output_dir) / "status.json"
    if not status_path.exists():
        return
        
    try:
        with open(status_path, "r") as f:
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
        
    try:
        with open(status_path, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


def process_image_to_audio(image_path: str, output_dir: str, base_name: str) -> dict:
    output_dir_path = Path(output_dir)
    current_step = "omr"

    try:
        _set_status(output_dir, "omr", "processing")

        # 1. Enhance Quality
        image_path_obj = Path(image_path)
        enhanced_path = process_file(image_path_obj, force=True)
        
        if enhanced_path:
            actual_image_path = str(enhanced_path)
            actual_base_name = enhanced_path.stem
        else:
            actual_image_path = image_path
            actual_base_name = base_name

        input_mxl = output_dir_path / f"{actual_base_name}.mxl"
        final_mxl = output_dir_path / f"{base_name}.mxl"
        output_midi = output_dir_path / f"{base_name}.mid"
        output_audio = output_dir_path / f"{base_name}.wav"

        audiveris_command = [
            AUDIVERIS_PATH,
            "-batch",
            "-export",
            "-output",
            str(output_dir_path),
            actual_image_path,
        ]
        # On Linux (Docker / Render) JavaFX requires a display server even in
        # batch mode — it links to GTK/X11 at JVM startup. xvfb-run provides a
        # virtual framebuffer so the process can start without a real monitor.
        if os.name != "nt":
            # Minimal virtual framebuffer — Audiveris only needs a display to
            # exist for JavaFX initialisation, not to render anything visible.
            # 640×480×8-bit uses ~300 KB of shared memory vs ~3.7 MB for the
            # previous 1280×1024×24-bit setting.
            audiveris_command = ["xvfb-run", "-a", "--server-args=-screen 0 640x480x8"] + audiveris_command
        _run_step("Audiveris", audiveris_command)

        # Audiveris 5.x creates the MXL inside a *subdirectory* named after the
        # input stem: output_dir/{stem}/{stem}.mxl — not flat in output_dir.
        # Search recursively so the code works regardless of Audiveris version.
        found_mxl: Path | None = None
        if input_mxl.exists():
            found_mxl = input_mxl
        else:
            candidates = list(output_dir_path.glob("**/*.mxl"))
            if candidates:
                # Prefer the one whose stem matches; otherwise take the first.
                for c in candidates:
                    if c.stem == actual_base_name:
                        found_mxl = c
                        break
                if not found_mxl:
                    found_mxl = candidates[0]

        if not found_mxl:
            raise RuntimeError(
                "Audiveris did not produce MusicXML output. "
                "Check that the image is clear, well-lit sheet music with full staves visible."
            )

        _set_status(output_dir, "omr", "completed")
        current_step = "musicxml"
        _set_status(output_dir, "musicxml", "processing")

        # Move the MXL to the canonical location (base_name, no _better_quality suffix).
        if found_mxl != final_mxl:
            shutil.move(str(found_mxl), str(final_mxl))
            # Remove the now-empty subdirectory Audiveris created.
            leftover_dir = found_mxl.parent
            if leftover_dir != output_dir_path and leftover_dir.exists():
                shutil.rmtree(str(leftover_dir), ignore_errors=True)
        input_mxl = final_mxl

        _set_status(output_dir, "musicxml", "completed")
        current_step = "midi"
        _set_status(output_dir, "midi", "processing")

        score = converter.parse(str(input_mxl))
        score.write("midi", fp=str(output_midi))

        if not output_midi.exists():
            raise RuntimeError("Failed to convert MusicXML to MIDI.")

        _set_status(output_dir, "midi", "completed")
        current_step = "audio"
        _set_status(output_dir, "audio", "processing")

        fluidsynth_command = [
            FLUIDSYNTH_PATH,
            "-ni",
            "-F",
            str(output_audio),
            "-r",
            "44100",
            SOUNDFONT,
            str(output_midi),
        ]
        _run_step("FluidSynth", fluidsynth_command)

        if not output_audio.exists():
            raise RuntimeError("Failed to synthesize audio from MIDI.")

        _set_status(output_dir, "audio", "completed")
        current_step = "analysis"
        _set_status(output_dir, "analysis", "processing")

        try:
            from music.analysis import analyze_score
            report = analyze_score(str(input_mxl))
            report_path = output_dir_path / "analysis_report.json"
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
        except Exception as ae:
            print(f"[pipeline] Analysis failed: {ae}")
            # Write a minimal analysis report so we don't break subsequent steps
            report_path = output_dir_path / "analysis_report.json"
            try:
                with open(report_path, "w", encoding="utf-8") as f:
                    json.dump({"error": str(ae)}, f)
            except Exception:
                pass

        _set_status(output_dir, "analysis", "completed")

        # Clean up the temporary enhanced image — it's large and no longer needed.
        if enhanced_path and Path(actual_image_path).exists():
            try:
                Path(actual_image_path).unlink()
            except Exception:
                pass

        return {
            "musicxml_path": str(input_mxl),
            "midi_path": str(output_midi),
            "audio_path": str(output_audio),
        }
    except Exception as exc:
        _set_status(output_dir, current_step, "failed", str(exc))
        raise exc

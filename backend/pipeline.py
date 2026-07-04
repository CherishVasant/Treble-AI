from music21 import converter
from pathlib import Path
import subprocess
import shutil
from enhance_quality import process_file


AUDIVERIS_PATH = r"C:\Program Files\Audiveris\Audiveris.exe"
FLUIDSYNTH_PATH = r"C:\tools\fluidsynth\bin\fluidsynth.exe"
SOUNDFONT = r"C:\Users\CHERISH\DEV\PersonalProjects\Treble-AI\backend\soundfonts\GeneralUser-GS.sf2"


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
    if command[0] and not Path(command[0]).exists():
        raise RuntimeError(f"{label} not found at {command[0]}")

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
        _run_step("Audiveris", audiveris_command)

        if not input_mxl.exists():
            raise RuntimeError(
                "Audiveris did not produce MusicXML output. Check that the image is clear sheet music."
            )

        _set_status(output_dir, "omr", "completed")
        current_step = "musicxml"
        _set_status(output_dir, "musicxml", "processing")

        if input_mxl != final_mxl:
            shutil.move(str(input_mxl), str(final_mxl))
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

        return {
            "musicxml_path": str(input_mxl),
            "midi_path": str(output_midi),
            "audio_path": str(output_audio),
        }
    except Exception as exc:
        _set_status(output_dir, current_step, "failed", str(exc))
        raise exc

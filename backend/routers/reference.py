from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
import hashlib
import subprocess
from pathlib import Path
from music21 import stream, note, tempo

from pipeline import FLUIDSYNTH_PATH, SOUNDFONT
from reference_library import get_reference_library as load_cached_library

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/library")
def get_reference_library() -> dict:
    return load_cached_library()


@router.get("/scale-audio")
def get_scale_audio(notes: str = Query(..., description="Comma-separated notes of the scale")) -> FileResponse:
    if not notes:
        raise HTTPException(status_code=400, detail="Notes parameter is required")

    notes_list = [n.strip() for n in notes.split(",") if n.strip()]
    if not notes_list:
        raise HTTPException(status_code=400, detail="Invalid notes format")

    # Create output scales directory
    scales_dir = Path("output") / "scales"
    scales_dir.mkdir(parents=True, exist_ok=True)

    # Hash notes list for caching
    notes_str = ",".join(notes_list)
    notes_hash = hashlib.md5(notes_str.encode("utf-8")).hexdigest()
    output_wav = scales_dir / f"{notes_hash}.wav"

    # Synthesize if not cached
    if not output_wav.exists():
        midi_path = scales_dir / f"{notes_hash}.mid"
        try:
            # 1. Create MIDI file using music21
            s = stream.Stream()
            # tempo: 150 bpm (corresponds to ~0.4s quarter notes)
            s.append(tempo.MetronomeMark(number=150))
            for n_name in notes_list:
                nt = note.Note(n_name)
                nt.quarterLength = 1.0  # 1 beat
                s.append(nt)

            s.write("midi", fp=str(midi_path))

            # 2. Synthesize using FluidSynth
            fluidsynth_command = [
                FLUIDSYNTH_PATH,
                "-ni",
                "-F",
                str(output_wav),
                "-r",
                "44100",
                SOUNDFONT,
                str(midi_path),
            ]

            if not Path(FLUIDSYNTH_PATH).exists():
                raise FileNotFoundError(f"FluidSynth not found at {FLUIDSYNTH_PATH}")

            result = subprocess.run(fluidsynth_command, capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"FluidSynth failed: {result.stderr}")

        except Exception as e:
            # Clean up partial wav if any
            if output_wav.exists():
                try:
                    output_wav.unlink()
                except Exception:
                    pass
            raise HTTPException(status_code=500, detail=f"Scale synthesis failed: {str(e)}")
        finally:
            # Always clean up the temporary mid file
            if midi_path.exists():
                try:
                    midi_path.unlink()
                except Exception:
                    pass

    return FileResponse(
        path=str(output_wav),
        media_type="audio/wav",
        filename=f"scale_{notes_hash}.wav",
    )


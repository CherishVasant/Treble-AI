from music21 import converter
from pathlib import Path
import subprocess


AUDIVERIS_PATH = r"C:\Program Files\Audiveris\Audiveris.exe"
FLUIDSYNTH_PATH = r"C:\tools\fluidsynth\bin\fluidsynth.exe"
SOUNDFONT = r"C:\Users\CHERISH\DEV\PersonalProjects\Treble-AI\backend\soundfonts\GeneralUser-GS.sf2"


def process_image_to_audio(image_path: str, output_dir: str, base_name: str) -> dict:

    output_dir = Path(output_dir)

    input_mxl = output_dir / f"{base_name}.mxl"
    output_midi = output_dir / f"{base_name}.mid"
    output_audio = output_dir / f"{base_name}.wav"

    # Audiveris OMR
    audiveris_command = [
        AUDIVERIS_PATH,
        "-batch",
        "-export",
        "-output",
        str(output_dir),
        image_path
    ]

    subprocess.run(audiveris_command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # MusicXML → MIDI
    score = converter.parse(str(input_mxl))
    score.write("midi", fp=str(output_midi))

    # MIDI → WAV
    fluidsynth_command = [
        FLUIDSYNTH_PATH,
        "-ni",
        "-F",
        str(output_audio),
        "-r",
        "44100",
        SOUNDFONT,
        str(output_midi)
    ]

    subprocess.run(fluidsynth_command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return {
        "musicxml_path": str(input_mxl),
        "midi_path": str(output_midi),
        "audio_path": str(output_audio)
    }
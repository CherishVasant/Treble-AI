from music21 import converter
from pathlib import Path
import subprocess

# Path configuration

INPUT_IMAGE = r"C:\Users\CHERISH\DEV\PersonalProjects\Treble-AI\backend\input\s2.png"

AUDIVERIS_PATH = r"C:\Program Files\Audiveris\Audiveris.exe"

OUTPUT_DIR = r"C:\Users\CHERISH\DEV\PersonalProjects\Treble-AI\backend\output"

INPUT_MXL = rf"{OUTPUT_DIR}\s2.mxl"

OUTPUT_MIDI = rf"{OUTPUT_DIR}\output.mid"

OUTPUT_AUDIO = rf"{OUTPUT_DIR}\output.wav"

SOUNDFONT = r"C:\Users\CHERISH\DEV\PersonalProjects\Treble-AI\backend\soundfonts\GeneralUser-GS.sf2"

FLUIDSYNTH_PATH = r"C:\tools\fluidsynth\bin\fluidsynth.exe"

# Create output directory

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# Run Audiveris OMR

print("Running Audiveris OMR...")

audiveris_command = [
    AUDIVERIS_PATH,
    "-batch",
    "-export",
    "-output",
    OUTPUT_DIR,
    INPUT_IMAGE
]

subprocess.run(
    audiveris_command,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)

print("Audiveris processing completed.")

# Load MusicXML

print("Loading MusicXML...")

score = converter.parse(INPUT_MXL)

print("MusicXML loaded successfully.")

# Generate MIDI

print("Generating MIDI...")

score.write("midi", fp=OUTPUT_MIDI)

print(f"MIDI saved to: {OUTPUT_MIDI}")

# Render audio using FluidSynth

print("Rendering audio using FluidSynth...")

fluidsynth_command = [
    FLUIDSYNTH_PATH,
    "-ni",
    "-F",
    OUTPUT_AUDIO,
    "-r",
    "44100",
    SOUNDFONT,
    OUTPUT_MIDI
]

subprocess.run(
    fluidsynth_command,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)

print(f"Audio saved to: {OUTPUT_AUDIO}")

print("Pipeline completed successfully.")
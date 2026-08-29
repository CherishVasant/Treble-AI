# OEMER OMR Pipeline

Converts sheet music images → MusicXML → MIDI → Audio using:
- **OEMER** – neural OMR engine
- **music21** – MusicXML → MIDI conversion
- **FluidSynth** – MIDI → WAV rendering

## Setup (one-time)

```bash
cd backend/oemer

# Create & activate the venv
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Mac/Linux

# Install dependencies
pip install oemer music21

# First run downloads OEMER's neural-net checkpoints (~few hundred MB, one-time)
```

## Usage

1. Drop your PNG / JPG sheet music scans into `input/`
2. Run:

```bash
# activate venv first
.\venv\Scripts\activate

# process everything in input/
python convert.py

# or process a specific file
python convert.py input/my_score.png
```

3. Outputs land in `output/<filename>/`:
   - `<name>.musicxml` — OEMER's structured score
   - `<name>.mid`      — MIDI from music21
   - `<name>.wav`      — audio from FluidSynth

## Notes

- First run is slow (OEMER downloads checkpoints). Subsequent runs are faster.
- CPU: ~2 min/page. GPU (if available): faster.
- FluidSynth uses `backend/soundfonts/GeneralUser-GS.sf2`.
- FluidSynth binary is expected at `C:\tools\fluidsynth\bin\fluidsynth.exe`.

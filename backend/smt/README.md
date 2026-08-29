# SMT (Sheet Music Transformer) — local OMR pipeline

Converts sheet-music images directly to MIDI + WAV using the
[Sheet Music Transformer](https://huggingface.co/antoniorv6/smt-grandstaff)
from HuggingFace.

## Pipeline

```
image → preprocess (grayscale/CLAHE/unsharp) → SMT inference
      → bekern tokens → music21 kern parser → MIDI → FluidSynth WAV
```

No MusicXML intermediate — bekern → MIDI directly.

## Setup (one-time)

```bash
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt
```

## Usage

```bash
# Drop images in input/, then:
venv\Scripts\python convert.py

# Single image:
venv\Scripts\python convert.py path/to/score.png

# Camera/photo checkpoint (better for phone photos):
venv\Scripts\python convert.py --model camera
```

## Models

| Key | HuggingFace checkpoint | Best for |
|---|---|---|
| `grandstaff` (default) | `antoniorv6/smt-grandstaff` | Clean scans / PDFs |
| `camera` | `antoniorv6/smt-camera-grandstaff` | Phone photos |

Both models expect **grand-staff input** (treble + bass on one system).
For multi-system scores, crop each system separately before running.

## Output

```
output/<stem>/
  <stem>.mid            — MIDI
  <stem>.wav            — rendered audio
  <stem>.krn            — reconstructed Humdrum **kern (debug)
  <stem>_tokens.txt     — raw SMT bekern tokens (debug)
  <stem>_bekern.txt     — copy of bekern tokens
```

## Notes

- First run downloads the model from HuggingFace (~500 MB), cached afterwards.
- CUDA is used automatically if available; falls back to CPU otherwise.
- `venv/` is gitignored (heavy). Re-create with `pip install -r requirements.txt`.
- FluidSynth must be installed at `C:\tools\fluidsynth\bin\fluidsynth.exe`.
- Soundfont: `../soundfonts/GeneralUser-GS.sf2`

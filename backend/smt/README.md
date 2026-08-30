# SMT (Sheet Music Transformer) — local OMR pipeline

Converts sheet-music images to MIDI + WAV using the
[Sheet Music Transformer](https://huggingface.co/antoniorv6/smt-grandstaff)
from HuggingFace.

## Pipeline

```
image → split into systems → SMT inference (bekern tokens)
      → ekern → **kern → music21 MIDI → FluidSynth WAV
```

## Setup (one-time)

```bash
# 1. Clone the SMT repo (required — model class is not pip-installable)
git clone --depth=1 https://github.com/antoniorv6/SMT.git smt_repo

# 2. Create venv + install deps
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt
```

## Usage

```bash
# Drop images in input/, then:
venv\Scripts\python convert.py

# Single image:
venv\Scripts\python convert.py path/to/score.png

# Camera/photo checkpoint:
venv\Scripts\python convert.py --model camera
```

## Models

| Key | HuggingFace checkpoint | Best for |
|---|---|---|
| `grandstaff` (default) | `antoniorv6/smt-grandstaff` | Clean PDF scans |
| `camera` | `antoniorv6/smt-camera-grandstaff` | Phone photos |

## Output

```
output/<stem>/
  <stem>.mid              — MIDI
  <stem>.wav              — rendered audio
  <stem>.krn              — merged Humdrum **kern (debug)
  <stem>_sys01.krn ...    — per-system kern (debug)
  <stem>_bekern.txt       — merged bekern tokens (debug)
```

---

## ⚠️ Known limitation: SMT requires single-system input crops

SMT was trained on the **GrandStaff dataset** — individual grand-staff system
crops extracted from PDF scores, typically:
- **Width**: 1500–3056 px  
- **Height**: ≤ 256 px (one treble + bass staff)
- **Source**: clean PDF rendering, not scans or photos

### What this means

| Input type | Audiveris | OEMER | SMT |
|---|---|---|---|
| Full-page PDF scan | ✅ (with line splitting) | ✅ | ❌ needs system crops |
| Camera photo | ❌ | ❌ | ✅ (`smt-camera-grandstaff`) |
| Render (512 MB) | ✅ (split trick) | ❌ 600–900 MB model | ✅ tiny 86 MB model |

Full-page images fail because `convert.py`'s current splitter uses **white-band row projection** to detect gaps between systems. When gaps aren't visually clear (e.g. dense engraving, tight margins), it falls back to equal-height strips — which cut through staff lines and produce unrecognizable crops.

### To make SMT work on full pages

You need a **staff-line detector** upstream to find true system boundaries:

1. **stafflineSeg** (deep learning): https://github.com/ThomasPDye/stafflineSeg
2. **deskew + morphological line detection** (classical): find runs of near-horizontal black pixels
3. **Audiveris' own line detection** (Java): extract via its REST API before running SMT

Once you have pixel-row coordinates of each system boundary, feed one cropped system at a time to `convert.py` and concatenate the resulting kern files.

### Why SMT is still worth pursuing for Render

- Model is 86 MB (vs 600–900 MB for OEMER, vs JVM overhead for Audiveris)
- No JVM, no ONNX Runtime
- The `smt-camera-grandstaff` checkpoint handles real-world photos
- Once staff detection is solved, SMT fits the 512 MB limit easily

---

## Notes

- First run downloads the model from HuggingFace (~86 MB), cached afterwards.
- CUDA is used automatically if available; falls back to CPU (slower).
- `venv/` and `smt_repo/` are gitignored (heavy/cloned). Re-create with the setup commands above.
- FluidSynth: `C:\tools\fluidsynth\bin\fluidsynth.exe`
- Soundfont: `../soundfonts/GeneralUser-GS.sf2`
- `transformers` is pinned to `==4.44.0` — transformers 5.x broke `SMTConfig` attribute lookup.

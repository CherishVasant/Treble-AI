"""
SMT (Sheet Music Transformer) pipeline
=======================================
Image → bekern tokens (SMT) → MIDI (music21 kern parser) → WAV (FluidSynth)

Models:
  antoniorv6/smt-grandstaff          — clean/scanned grand staff images
  antoniorv6/smt-camera-grandstaff   — phone-camera / real-world photos

Usage:
  python convert.py                          # all PNG/JPG in ./input/
  python convert.py path/to/score.png        # single image
  python convert.py --model camera           # use camera-trained checkpoint
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path
from io import StringIO

# ── paths ──────────────────────────────────────────────────────────────────────
HERE       = Path(__file__).parent
INPUT_DIR  = HERE / "input"
OUTPUT_DIR = HERE / "output"
SOUNDFONT  = HERE.parent / "soundfonts" / "GeneralUser-GS.sf2"
FLUIDSYNTH = Path(r"C:\tools\fluidsynth\bin\fluidsynth.exe")

MODELS = {
    "grandstaff": "antoniorv6/smt-grandstaff",
    "camera":     "antoniorv6/smt-camera-grandstaff",
}

# ── helpers ────────────────────────────────────────────────────────────────────
def run(cmd: list, label: str) -> None:
    print(f"\n[{label}] $ {' '.join(str(c) for c in cmd)}")
    t0 = time.time()
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"{label} failed (exit {result.returncode})\n{result.stderr.strip()}")
    print(f"  done in {time.time()-t0:.1f}s")


# ── preprocessing (same approach as Audiveris/OEMER pipeline) ─────────────────
def preprocess_image(image_path: Path) -> Path:
    """
    Grayscale + upscale + denoise + CLAHE + unsharp-mask.
    SMT operates on single-system images — the user is expected to crop
    one system per image (or we process full pages and let SMT handle it).
    """
    import cv2, numpy as np

    MIN_WIDTH = 1600   # SMT's CNN expects sufficient resolution

    raw = np.fromfile(str(image_path), dtype=np.uint8)
    bgr = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if bgr is None:
        print(f"  [preprocess] cannot decode {image_path.name}, using as-is")
        return image_path

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    h, w = gray.shape
    if max(h, w) < MIN_WIDTH:
        scale = MIN_WIDTH / max(h, w)
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4)

    gray = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=1.0)
    import numpy as np
    gray = np.clip(cv2.addWeighted(gray, 1.5, blurred, -0.5, 0), 0, 255).astype(np.uint8)

    out = image_path.with_name(f"{image_path.stem}.prep.png")
    ok, enc = cv2.imencode(".png", gray, [int(cv2.IMWRITE_PNG_COMPRESSION), 3])
    if ok:
        enc.tofile(str(out))
        print(f"  [preprocess] {image_path.name} → {out.name}  {gray.shape[1]}×{gray.shape[0]}")
        return out
    return image_path


# ── SMT inference ─────────────────────────────────────────────────────────────
def run_smt(image_path: Path, model_id: str) -> str:
    """
    Load the SMT model from HuggingFace and run inference.
    Returns the decoded bekern token sequence as a string.
    """
    from transformers import AutoTokenizer, VisionEncoderDecoderModel, AutoFeatureExtractor
    from PIL import Image
    import torch

    print(f"  [SMT] loading model {model_id} …")
    t0 = time.time()

    model     = VisionEncoderDecoderModel.from_pretrained(model_id)
    extractor = AutoFeatureExtractor.from_pretrained(model_id)
    tokenizer = AutoTokenizer.from_pretrained(model_id)

    model.eval()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    print(f"  [SMT] model loaded in {time.time()-t0:.1f}s  (device: {device})")

    img = Image.open(image_path).convert("RGB")
    inputs = extractor(images=img, return_tensors="pt").to(device)

    with torch.no_grad():
        generated = model.generate(
            **inputs,
            max_new_tokens=1024,
            num_beams=4,
        )

    decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)[0]
    print(f"  [SMT] inference done — {len(decoded.split())} tokens")
    return decoded


# ── bekern → MIDI ─────────────────────────────────────────────────────────────
def bekern_to_midi(bekern: str, out_dir: Path, stem: str) -> Path:
    """
    Convert bekern token sequence to MIDI via music21's kern parser.
    bekern is the bipartite kern encoding used in the GrandStaff dataset.

    The sequence encodes two voices (treble/bass) interleaved. We reconstruct
    a standard **kern string with two spines, parse with music21, and save MIDI.
    """
    from music21 import converter, midi as m21midi

    mid_path = out_dir / f"{stem}.mid"
    kern_path = out_dir / f"{stem}.krn"

    # Save raw tokens for inspection
    (out_dir / f"{stem}_tokens.txt").write_text(bekern, encoding="utf-8")

    # ── Reconstruct a two-spine kern string ───────────────────────────────────
    # SMT bekern tokens look like: "note-C4-Q note-G3-Q barline note-D4-H ..."
    # The exact token vocabulary depends on the model version.
    # We attempt a best-effort conversion here; adjust if the model uses
    # a different token schema.
    kern_lines = _bekern_to_kern_lines(bekern)
    kern_str   = "\n".join(kern_lines)
    kern_path.write_text(kern_str, encoding="utf-8")
    print(f"  [kern] written {len(kern_lines)} lines → {kern_path.name}")

    try:
        score = converter.parse(kern_str, format="humdrum")
    except Exception as e:
        print(f"  [kern] music21 parse failed ({e}), trying file path …")
        score = converter.parse(str(kern_path))

    mf = m21midi.translate.music21ObjectToMidiFile(score)
    mf.open(str(mid_path), "wb")
    mf.write()
    mf.close()
    print(f"  [MIDI] written → {mid_path.name}  ({mid_path.stat().st_size} bytes)")
    return mid_path


def _bekern_to_kern_lines(bekern: str) -> list[str]:
    """
    Convert the SMT bekern token string to Humdrum **kern lines.

    SMT encodes a grand staff as an interleaved sequence.  The token schema
    used in the GrandStaff dataset is documented at:
      https://github.com/antoniorv6/SMT

    This parser handles the known token format. Unknown tokens are printed
    as warnings and skipped.
    """
    import re

    # SMT token format (from the GrandStaff dataset vocabulary):
    #   pitch-like:  note.<duration><pitch>   e.g. note.4C5  note.8G4  note.2r
    #   chords:      chord.<dur>.<p1>.<p2>    (less common)
    #   barlines:    barline
    #   clef:        clef.G2  clef.F4
    #   timesig:     timesig.4/4
    #   keysig:      keysig.2#  keysig.1b
    #   separator:   +  (separates treble/bass tokens for same beat)
    #
    # We build two spine lists (treble, bass) and combine into **kern.

    # Duration map: SMT digit → kern duration value
    DUR = {"1": "1", "2": "2", "4": "4", "8": "8", "16": "16", "32": "32",
           "0": "0",   # breve
           "6": "4.",  # dotted quarter
           "3": "2.",  # dotted half
           "7": "8.",  # dotted eighth
    }

    # Pitch: SMT uses scientific notation (C4 = middle C)
    # kern uses octave ticks: C4 = c  C5 = cc  C3 = C  C2 = CC etc.
    def to_kern_pitch(p: str) -> str:
        if p.lower() == "r":
            return "r"
        m = re.match(r"([A-Ga-g][#b]?)(\d+)", p)
        if not m:
            return "r"
        note, oct_s = m.group(1), int(m.group(2))
        accidental = ""
        if "#" in note:
            accidental = "#"
            note = note[0]
        elif "b" in note:
            accidental = "-"
            note = note[0]
        # kern: oct 4 → lowercase, oct 5 → cc, oct 3 → uppercase, etc.
        if oct_s >= 4:
            return note.lower() * (oct_s - 3) + accidental
        else:
            return note.upper() * (4 - oct_s) + accidental

    tokens = bekern.split()

    treble_spine: list[str] = ["**kern"]
    bass_spine:   list[str] = ["**kern"]

    # Track which spine we're currently filling
    # Simple heuristic: tokens before '+' → treble, after '+' → bass
    # Some models output interleaved with explicit voice markers.
    current_treble: list[str] = []
    current_bass:   list[str] = []
    in_bass = False

    def flush_beat():
        nonlocal in_bass
        t = " ".join(current_treble) if current_treble else "."
        b = " ".join(current_bass)   if current_bass   else "."
        treble_spine.append(t)
        bass_spine.append(b)
        current_treble.clear()
        current_bass.clear()
        in_bass = False

    i = 0
    while i < len(tokens):
        tok = tokens[i]

        if tok == "+":
            in_bass = True
            i += 1
            continue

        if tok == "barline":
            flush_beat()
            treble_spine.append("=")
            bass_spine.append("=")
            i += 1
            continue

        if tok.startswith("clef."):
            clef = "clef" + tok[5:]
            if in_bass:
                bass_spine.append(f"*{clef}")
                treble_spine.append("*")
            else:
                treble_spine.append(f"*{clef}")
                bass_spine.append("*")
            i += 1
            continue

        if tok.startswith("timesig."):
            ts = tok[8:].replace("/", "/")
            treble_spine.append(f"*M{ts}")
            bass_spine.append(f"*M{ts}")
            i += 1
            continue

        if tok.startswith("keysig."):
            ks = tok[7:]
            treble_spine.append(f"*k[{ks}]")
            bass_spine.append(f"*k[{ks}]")
            i += 1
            continue

        # Note or rest: expect format  note.<dur><pitch>  or  note.<dur>r
        m = re.match(r"note\.(\d+\.?)([A-Ga-g][#b]?\d+|r)", tok, re.IGNORECASE)
        if m:
            dur_str, pitch_str = m.group(1), m.group(2)
            dur  = DUR.get(dur_str.rstrip("."), dur_str)
            if dur_str.endswith("."):
                dur = DUR.get(dur_str.rstrip("."), dur_str.rstrip(".")) + "."
            kpitch = to_kern_pitch(pitch_str)
            kern_note = f"{dur}{kpitch}"
            (current_bass if in_bass else current_treble).append(kern_note)
            i += 1
            continue

        # Unknown token — skip
        print(f"  [kern] unknown token: {tok!r}")
        i += 1

    if current_treble or current_bass:
        flush_beat()

    treble_spine.append("*-")
    bass_spine.append("*-")

    # Zip into two-column Humdrum file
    lines = []
    for t, b in zip(treble_spine, bass_spine):
        lines.append(f"{t}\t{b}")
    return lines


# ── MIDI → Audio ──────────────────────────────────────────────────────────────
def midi_to_audio(mid_path: Path, out_dir: Path) -> Path:
    wav_path = out_dir / (mid_path.stem + ".wav")
    run(
        [str(FLUIDSYNTH), "-ni",
         "-F", str(wav_path), "-r", "44100",  # -F before soundfont (FluidSynth 2.x)
         str(SOUNDFONT), str(mid_path)],
        "FluidSynth",
    )
    return wav_path


# ── main pipeline ──────────────────────────────────────────────────────────────
def process(image_path: Path, model_id: str):
    image_path = image_path.resolve()
    out_dir    = OUTPUT_DIR / image_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}\nProcessing: {image_path.name}\n{'='*60}")
    t0 = time.time()

    proc_path = preprocess_image(image_path)

    bekern = run_smt(proc_path, model_id)
    (out_dir / f"{image_path.stem}_bekern.txt").write_text(bekern)

    mid_path = bekern_to_midi(bekern, out_dir, image_path.stem)
    wav_path = midi_to_audio(mid_path, out_dir)

    # Clean up temp preprocessed file
    if proc_path != image_path and proc_path.exists():
        proc_path.unlink()

    print(f"\n✓ Done in {time.time()-t0:.1f}s  →  output/{image_path.stem}/")


def main():
    parser = argparse.ArgumentParser(description="SMT OMR pipeline")
    parser.add_argument("images", nargs="*", help="Image files (default: all in ./input/)")
    parser.add_argument("--model", choices=["grandstaff", "camera"], default="grandstaff",
                        help="Which SMT checkpoint to use (default: grandstaff)")
    args = parser.parse_args()

    model_id = MODELS[args.model]

    paths = ([Path(p) for p in args.images]
             if args.images
             else sorted(INPUT_DIR.glob("*.png"))
               + sorted(INPUT_DIR.glob("*.jpg"))
               + sorted(INPUT_DIR.glob("*.jpeg")))

    if not paths:
        print(f"No images in {INPUT_DIR}. Drop PNG/JPG files there and re-run.")
        sys.exit(0)

    print(f"SMT model : {model_id}")
    print(f"Images    : {len(paths)}")

    ok, fail = [], []
    for p in paths:
        try:
            process(p, model_id)
            ok.append(p)
        except Exception as e:
            print(f"\n[ERROR] {p.name}: {e}")
            fail.append((p, e))

    print(f"\n{'='*60}")
    print(f"Summary: {len(ok)} succeeded, {len(fail)} failed.")
    if fail:
        for p, e in fail: print(f"  ✗ {p.name}: {e}")


if __name__ == "__main__":
    main()

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

# ── paths ──────────────────────────────────────────────────────────────────────
HERE       = Path(__file__).parent
INPUT_DIR  = HERE / "input"
OUTPUT_DIR = HERE / "output"
SOUNDFONT  = HERE.parent / "soundfonts" / "GeneralUser-GS.sf2"
FLUIDSYNTH = Path(r"C:\tools\fluidsynth\bin\fluidsynth.exe")

# The SMT GitHub repo is cloned here (gitignored, local only)
SMT_REPO = HERE / "smt_repo"

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


def _ensure_smt_repo():
    """Make sure the SMT GitHub repo is on sys.path so we can import SMTModelForCausalLM."""
    if not SMT_REPO.exists():
        raise FileNotFoundError(
            f"SMT repo not found at {SMT_REPO}.\n"
            "Run: git clone --depth=1 https://github.com/antoniorv6/SMT.git smt_repo"
        )
    repo_str = str(SMT_REPO)
    if repo_str not in sys.path:
        sys.path.insert(0, repo_str)


# ── preprocessing ─────────────────────────────────────────────────────────────
def img_to_tensor(image_path: Path):
    """
    Load image, convert to grayscale float tensor [0,1] in shape (1, H, W).
    Mirrors what the SMT repo's convert_img_to_tensor() does, using our
    enhanced quality pipeline first (upscale / denoise / CLAHE / unsharp).
    """
    import cv2
    import numpy as np
    import torch
    from torchvision import transforms

    MIN_WIDTH = 1600

    raw = np.fromfile(str(image_path), dtype=np.uint8)
    bgr = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if bgr is None:
        raise RuntimeError(f"Could not decode image: {image_path}")

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    h, w = gray.shape
    if max(h, w) < MIN_WIDTH:
        scale = MIN_WIDTH / max(h, w)
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4)

    gray = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=1.0)
    gray = np.clip(cv2.addWeighted(gray, 1.5, blurred, -0.5, 0), 0, 255).astype(np.uint8)

    h2, w2 = gray.shape
    print(f"  [preprocess] {image_path.name}  {w}×{h} → {w2}×{h2}")

    # torchvision expects uint8 HWC or HW numpy — convert to tensor [0,1]
    to_tensor = transforms.ToTensor()   # HW uint8 → (1,H,W) float [0,1]
    tensor = to_tensor(gray)            # shape (1, H, W)
    return tensor


# ── SMT inference ─────────────────────────────────────────────────────────────
def run_smt(image_path: Path, model_id: str) -> str:
    """
    Run SMT inference. Returns the decoded bekern string with SMT special tokens
    already replaced:
      <b> → \n   (Humdrum record separator)
      <s> → ' '  (space within a record)
      <t> → \t   (tab / spine separator)

    The resulting string is a valid two-spine Humdrum **kern file.
    """
    import torch
    _ensure_smt_repo()
    from smt_model import SMTModelForCausalLM  # from smt_repo/

    print(f"  [SMT] loading model {model_id} …")
    t0 = time.time()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = SMTModelForCausalLM.from_pretrained(model_id).to(device)
    model.eval()
    print(f"  [SMT] model loaded in {time.time()-t0:.1f}s  (device: {device})")

    img_tensor = img_to_tensor(image_path).unsqueeze(0).to(device)   # (1,1,H,W)

    t1 = time.time()
    with torch.no_grad():
        predictions, _ = model.predict(img_tensor, convert_to_str=True)
    raw = "".join(predictions)
    print(f"  [SMT] inference done in {time.time()-t1:.1f}s — {len(raw.split())} tokens")

    # Replace SMT special tokens → standard whitespace
    kern_text = raw.replace("<b>", "\n").replace("<s>", " ").replace("<t>", "\t")
    return kern_text


# ── kern → MIDI ───────────────────────────────────────────────────────────────
def kern_to_midi(kern_text: str, out_dir: Path, stem: str) -> Path:
    """
    Parse the Humdrum **kern string (produced by SMT) with music21 and save MIDI.
    No MusicXML intermediate — kern → MIDI directly.
    """
    from music21 import converter, midi as m21midi

    kern_path = out_dir / f"{stem}.krn"
    mid_path  = out_dir / f"{stem}.mid"

    kern_path.write_text(kern_text, encoding="utf-8")
    print(f"  [kern] saved {len(kern_text.splitlines())} lines → {kern_path.name}")

    try:
        score = converter.parse(kern_text, format="humdrum")
    except Exception as e:
        print(f"  [kern] inline parse failed ({e}), retrying from file …")
        score = converter.parse(str(kern_path))

    mf = m21midi.translate.music21ObjectToMidiFile(score)
    mf.open(str(mid_path), "wb")
    mf.write()
    mf.close()
    print(f"  [MIDI] {mid_path.name}  {mid_path.stat().st_size:,} bytes")
    return mid_path


# ── MIDI → WAV ────────────────────────────────────────────────────────────────
def midi_to_audio(mid_path: Path, out_dir: Path) -> Path:
    wav_path = out_dir / (mid_path.stem + ".wav")
    run(
        [str(FLUIDSYNTH), "-ni",
         "-F", str(wav_path), "-r", "44100",   # -F before soundfont (FluidSynth 2.x)
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

    kern_text = run_smt(image_path, model_id)

    # Save raw bekern for inspection
    (out_dir / f"{image_path.stem}_bekern.txt").write_text(kern_text, encoding="utf-8")

    mid_path = kern_to_midi(kern_text, out_dir, image_path.stem)
    wav_path = midi_to_audio(mid_path, out_dir)

    print(f"\n✓ Done in {time.time()-t0:.1f}s  →  output/{image_path.stem}/")


def main():
    parser = argparse.ArgumentParser(description="SMT OMR pipeline")
    parser.add_argument("images", nargs="*", help="Image files (default: all in ./input/)")
    parser.add_argument("--model", choices=["grandstaff", "camera"], default="grandstaff",
                        help="Which SMT checkpoint (default: grandstaff)")
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
            import traceback; traceback.print_exc()
            fail.append((p, e))

    print(f"\n{'='*60}")
    print(f"Summary: {len(ok)} succeeded, {len(fail)} failed.")
    if fail:
        for p, e in fail: print(f"  ✗ {p.name}: {e}")


if __name__ == "__main__":
    main()

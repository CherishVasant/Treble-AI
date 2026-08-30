"""
SMT (Sheet Music Transformer) pipeline
=======================================
Image → split systems → SMT (bekern) → MIDI (music21 kern) → WAV (FluidSynth)

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

# GitHub clone of https://github.com/antoniorv6/SMT (gitignored, local only)
SMT_REPO = HERE / "smt_repo"

# SMT positional encoding is fixed to h_max=16 with 16× CNN downsampling
# → max input image height = 16 × 16 = 256 px
SMT_MAX_HEIGHT = 256

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
    """Add the cloned SMT repo to sys.path so SMTModelForCausalLM is importable."""
    if not SMT_REPO.exists():
        raise FileNotFoundError(
            f"SMT repo not found at {SMT_REPO}.\n"
            "Run: git clone --depth=1 https://github.com/antoniorv6/SMT.git smt_repo"
        )
    repo_str = str(SMT_REPO)
    if repo_str not in sys.path:
        sys.path.insert(0, repo_str)


# ── image preprocessing ───────────────────────────────────────────────────────
def load_and_enhance(image_path: Path):
    """
    Load image → grayscale.
    SMT was trained on clean PDF-extracted images; heavy enhancement
    (CLAHE, unsharp) makes real-world images look nothing like training data
    and causes hallucination. Use plain grayscale conversion only.
    """
    import cv2
    import numpy as np

    raw = np.fromfile(str(image_path), dtype=np.uint8)
    bgr = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if bgr is None:
        raise RuntimeError(f"Could not decode: {image_path}")

    return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)


def split_into_systems(gray, target_h: int = SMT_MAX_HEIGHT, min_h: int = 60):
    """
    Detect horizontal white-band gaps between grand-staff systems and split.
    Each strip is resized to exactly target_h height; width is PRESERVED
    (not scaled proportionally) so the model sees a full-width system crop
    matching its training distribution (~1500–3056 px wide, 256 px tall).

    Returns a list of uint8 grayscale ndarrays, one per system.
    """
    import cv2
    import numpy as np

    h, w = gray.shape

    # If the image already fits in height, return as-is (or just resize height)
    if h <= target_h:
        if h == target_h:
            return [gray]
        resized = cv2.resize(gray, (w, target_h), interpolation=cv2.INTER_LANCZOS4)
        return [resized]

    # Row projection: fraction of pixels that are "white" (≥ 200)
    row_white = np.mean(gray >= 200, axis=1)   # shape (H,)

    # Smooth with a small window to avoid noise triggering gaps
    import numpy as np
    kernel = np.ones(5) / 5
    row_white_smooth = np.convolve(row_white, kernel, mode='same')

    # A gap row = >80% white (less strict than before so gaps between systems are found)
    GAP_THRESH = 0.80
    is_gap = row_white_smooth > GAP_THRESH

    # Require a gap to be at least 3 consecutive rows to count
    MIN_GAP_ROWS = 3
    gap_starts = []
    in_gap = False
    gap_start = 0
    for i, gap in enumerate(is_gap):
        if gap and not in_gap:
            gap_start = i
            in_gap = True
        elif not gap and in_gap:
            if i - gap_start >= MIN_GAP_ROWS:
                gap_starts.append((gap_start, i))
            in_gap = False
    if in_gap and (h - gap_start) >= MIN_GAP_ROWS:
        gap_starts.append((gap_start, h))

    # Convert gaps → system spans
    systems_raw = []
    prev_end = 0
    for g_start, g_end in gap_starts:
        if g_start - prev_end >= min_h:
            systems_raw.append(gray[prev_end:g_start, :])
        prev_end = g_end
    if h - prev_end >= min_h:
        systems_raw.append(gray[prev_end:, :])

    if not systems_raw:
        # Fallback: divide image evenly into estimated number of systems
        # Assume each system is ~220px tall in original resolution
        n_est = max(1, round(h / 220))
        print(f"  [split] no gaps found; dividing into {n_est} equal strips")
        strip_h = h // n_est
        systems_raw = [gray[i*strip_h:(i+1)*strip_h, :] for i in range(n_est)]
        if h % n_est:
            systems_raw[-1] = gray[(n_est-1)*strip_h:, :]

    # Resize each strip to target_h; keep original width (matches training distribution)
    systems = []
    for idx, strip in enumerate(systems_raw):
        sh, sw = strip.shape
        resized = cv2.resize(strip, (sw, target_h), interpolation=cv2.INTER_LANCZOS4)
        print(f"  [split] system {idx+1}/{len(systems_raw)}  {sw}×{sh} → {sw}×{target_h}")
        systems.append(resized)

    return systems


def gray_to_tensor(gray):
    """Convert uint8 HW grayscale ndarray → float (1,H,W) tensor in [0,1]."""
    import torch
    from torchvision import transforms
    to_tensor = transforms.ToTensor()   # HW uint8 → (1,H,W) float
    return to_tensor(gray)


# ── SMT inference ─────────────────────────────────────────────────────────────
_smt_model_cache = {}   # model_id → model (avoid reloading between images)


def get_model(model_id: str):
    """Load (and cache) the SMT model."""
    import torch
    _ensure_smt_repo()
    from smt_model import SMTModelForCausalLM

    if model_id not in _smt_model_cache:
        print(f"  [SMT] loading model {model_id} …")
        t0 = time.time()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = SMTModelForCausalLM.from_pretrained(model_id).to(device)
        model.eval()
        _smt_model_cache[model_id] = (model, device)
        print(f"  [SMT] loaded in {time.time()-t0:.1f}s  (device: {device})")

    return _smt_model_cache[model_id]


def run_smt_on_system(system_gray, model_id: str) -> str:
    """
    Run SMT on a single system image (uint8 HW grayscale).
    Uses a custom greedy loop with repetition-break so the model doesn't
    hallucinate one token forever when the image is uncertain.
    Returns the kern text (SMT special tokens replaced with whitespace).
    """
    import torch
    import numpy as np

    model, device = get_model(model_id)
    i2w = model.i2w
    w2i = model.w2i
    maxlen = model.maxlen

    tensor = gray_to_tensor(system_gray).unsqueeze(0).to(device)   # (1,1,H,W)

    with torch.no_grad():
        encoder_output = model.forward_encoder(tensor)

        predicted = torch.tensor([[w2i['<bos>']]], device=device)
        text_seq = []
        repeat_count = 0
        last_token = None

        for _ in range(maxlen - 1):
            out = model.forward_decoder(encoder_output=encoder_output,
                                        last_predictions=predicted)
            tok_id = int(torch.argmax(out.logits[:, -1, :], dim=-1).item())
            tok = i2w[str(tok_id)]

            if tok == '<eos>':
                break

            # Break if the same token repeats more than 8 times in a row
            if tok == last_token:
                repeat_count += 1
                if repeat_count >= 8:
                    print(f"  [SMT] repetition break at token '{tok}'")
                    break
            else:
                repeat_count = 0
                last_token = tok

            text_seq.append(tok)
            predicted = torch.cat(
                [predicted, torch.tensor([[tok_id]], device=device)], dim=1
            )

    raw = "".join(text_seq)
    kern = raw.replace("<b>", "\n").replace("<s>", " ").replace("<t>", "\t")
    return kern


# ── kern → MIDI ───────────────────────────────────────────────────────────────
def merge_kern_strings(kern_list: list[str]) -> str:
    """
    Concatenate multiple two-spine **kern strings (one per system) into
    a single **kern file by stripping redundant headers/footers.
    """
    if len(kern_list) == 1:
        return kern_list[0]

    # Header = first two spine-declaration lines; footer = last *- line
    merged_lines = []
    for i, kern in enumerate(kern_list):
        lines = kern.strip().splitlines()
        if i == 0:
            merged_lines.extend(lines)          # keep everything from first system
        else:
            # Drop leading **kern / clef / keysig / timesig spine-opening records
            # Keep from the first note/barline onward
            body = []
            seen_note = False
            for ln in lines:
                stripped = ln.strip()
                if stripped.startswith("**") or stripped.startswith("*-"):
                    continue                     # skip spine delimiters
                if not seen_note:
                    # Skip interpretations (*M, *k, *clef…) until we hit a note or barline
                    if stripped.startswith("*") and not stripped.startswith("="):
                        continue
                    else:
                        seen_note = True
                body.append(ln)
            # Remove trailing *- lines from prior system, then append body + *-
            while merged_lines and merged_lines[-1].strip().startswith("*-"):
                merged_lines.pop()
            # Add a barline separator between systems if not already there
            if body and not body[0].strip().startswith("="):
                merged_lines.append("=\t=")
            merged_lines.extend(body)

    # Ensure file ends with *-
    if not merged_lines[-1].strip().startswith("*-"):
        merged_lines.append("*-\t*-")

    return "\n".join(merged_lines)


def kern_to_midi(kern_text: str, out_dir: Path, stem: str) -> Path:
    """Parse Humdrum **kern text with music21 → MIDI. No MusicXML step."""
    from music21 import converter, midi as m21midi

    kern_path = out_dir / f"{stem}.krn"
    mid_path  = out_dir / f"{stem}.mid"

    kern_path.write_text(kern_text, encoding="utf-8")
    print(f"  [kern] {len(kern_text.splitlines())} lines → {kern_path.name}")

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
         "-F", str(wav_path), "-r", "44100",
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

    # 1. Load + enhance
    gray = load_and_enhance(image_path)
    print(f"  [load] {gray.shape[1]}×{gray.shape[0]} px")

    # 2. Split into individual grand-staff systems
    systems = split_into_systems(gray)

    # 3. Run SMT on each system
    kern_texts = []
    for idx, sys_img in enumerate(systems):
        print(f"\n  ── System {idx+1}/{len(systems)} ──")
        t1 = time.time()
        kern = run_smt_on_system(sys_img, model_id)
        kern_texts.append(kern)
        (out_dir / f"{image_path.stem}_sys{idx+1:02d}.krn").write_text(kern, encoding="utf-8")
        print(f"  [SMT] {len(kern.split())} tokens in {time.time()-t1:.1f}s")

    # 4. Merge kern → MIDI
    full_kern = merge_kern_strings(kern_texts)
    (out_dir / f"{image_path.stem}_bekern.txt").write_text(full_kern, encoding="utf-8")

    mid_path = kern_to_midi(full_kern, out_dir, image_path.stem)

    # 5. MIDI → WAV
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

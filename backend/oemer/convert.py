"""
OEMER → MusicXML → MIDI → Audio pipeline
=========================================
Usage:
    python convert.py                  # process every PNG/JPG in ./input/
    python convert.py path/to/img.png  # process one specific image

Output files land in ./output/<stem>/
    <stem>.musicxml   – raw OEMER output
    <stem>.mid        – MIDI converted by music21
    <stem>.wav        – audio rendered by FluidSynth
"""

import argparse
import subprocess
import sys
import shutil
import time
from pathlib import Path

# ── paths ──────────────────────────────────────────────────────────────────────
HERE        = Path(__file__).parent
INPUT_DIR   = HERE / "input"
OUTPUT_DIR  = HERE / "output"
SOUNDFONT   = Path(__file__).parent.parent / "soundfonts" / "GeneralUser-GS.sf2"
FLUIDSYNTH  = Path(r"C:\tools\fluidsynth\bin\fluidsynth.exe")

# Use the oemer binary from this script's own venv so the venv
# does not need to be activated before running the script.
_VENV_SCRIPTS = HERE / "venv" / "Scripts"
OEMER_BIN = _VENV_SCRIPTS / "oemer.exe" if (_VENV_SCRIPTS / "oemer.exe").exists() else "oemer"

# music21 import (inside the venv)
try:
    import music21
    from music21 import converter, midi
except ImportError:
    print("[ERROR] music21 not found. Run:  pip install music21")
    sys.exit(1)


# ── helpers ────────────────────────────────────────────────────────────────────
def run(cmd: list, label: str) -> subprocess.CompletedProcess:
    print(f"\n[{label}] $ {' '.join(str(c) for c in cmd)}")
    t0 = time.time()
    result = subprocess.run(cmd, capture_output=True, text=True)
    elapsed = time.time() - t0
    if result.returncode != 0:
        print(f"  STDERR: {result.stderr.strip()}")
        raise RuntimeError(f"{label} failed (exit {result.returncode})")
    print(f"  done in {elapsed:.1f}s")
    return result


def find_musicxml(folder: Path, stem: str) -> Path | None:
    """OEMER writes the MusicXML next to the input image with the same stem."""
    for ext in (".musicxml", ".xml", ".mxl"):
        p = folder / f"{stem}{ext}"
        if p.exists():
            return p
    return None


def oemer_to_musicxml(image_path: Path, out_dir: Path) -> Path:
    """Run OEMER on the image; move the MusicXML to out_dir."""
    run([str(OEMER_BIN), str(image_path)], "OEMER")
    xml = find_musicxml(image_path.parent, image_path.stem)
    if xml is None:
        raise FileNotFoundError(
            f"OEMER did not produce a MusicXML file next to {image_path}"
        )
    dest = out_dir / xml.name
    shutil.move(str(xml), str(dest))
    # also move the detection-overlay image if present
    for overlay in image_path.parent.glob(f"{image_path.stem}*.png"):
        if overlay != image_path:
            shutil.move(str(overlay), str(out_dir / overlay.name))
    return dest


def musicxml_to_midi(xml_path: Path, out_dir: Path) -> Path:
    """Convert MusicXML → MIDI using music21."""
    score = converter.parse(str(xml_path))
    mid_path = out_dir / (xml_path.stem + ".mid")
    mf = midi.translate.music21ObjectToMidiFile(score)
    mf.open(str(mid_path), "wb")
    mf.write()
    mf.close()
    print(f"  [music21] MIDI written → {mid_path.name}")
    return mid_path


def midi_to_audio(mid_path: Path, out_dir: Path) -> Path:
    """Render MIDI → WAV with FluidSynth."""
    if not FLUIDSYNTH.exists():
        raise FileNotFoundError(f"FluidSynth not found at {FLUIDSYNTH}")
    if not SOUNDFONT.exists():
        raise FileNotFoundError(f"Soundfont not found at {SOUNDFONT}")
    wav_path = out_dir / (mid_path.stem + ".wav")
    run(
        [
            str(FLUIDSYNTH),
            "-ni",                  # no interactive mode
            str(SOUNDFONT),
            str(mid_path),
            "-F", str(wav_path),    # write to file
            "-r", "44100",          # sample rate
        ],
        "FluidSynth",
    )
    return wav_path


# ── main pipeline ──────────────────────────────────────────────────────────────
def process(image_path: Path):
    image_path = image_path.resolve()
    print(f"\n{'='*60}")
    print(f"Processing: {image_path.name}")
    print(f"{'='*60}")

    out_dir = OUTPUT_DIR / image_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    total = time.time()

    # 1. OEMER: image → MusicXML
    xml_path = oemer_to_musicxml(image_path, out_dir)
    print(f"  MusicXML → {xml_path.relative_to(HERE)}")

    # 2. music21: MusicXML → MIDI
    mid_path = musicxml_to_midi(xml_path, out_dir)
    print(f"  MIDI     → {mid_path.relative_to(HERE)}")

    # 3. FluidSynth: MIDI → WAV
    wav_path = midi_to_audio(mid_path, out_dir)
    print(f"  Audio    → {wav_path.relative_to(HERE)}")

    elapsed = time.time() - total
    print(f"\n✓ Done in {elapsed:.1f}s  →  output/{image_path.stem}/")
    return out_dir


def main():
    parser = argparse.ArgumentParser(description="OEMER OMR pipeline")
    parser.add_argument(
        "images",
        nargs="*",
        help="Image file(s) to process. Defaults to all PNG/JPG in ./input/",
    )
    args = parser.parse_args()

    if args.images:
        paths = [Path(p) for p in args.images]
    else:
        paths = sorted(INPUT_DIR.glob("*.png")) + sorted(INPUT_DIR.glob("*.jpg")) + sorted(INPUT_DIR.glob("*.jpeg"))

    if not paths:
        print(f"No images found in {INPUT_DIR}. Drop PNG/JPG files there and re-run.")
        sys.exit(0)

    print(f"Found {len(paths)} image(s) to process.")
    results = []
    errors  = []
    for p in paths:
        try:
            out = process(p)
            results.append(out)
        except Exception as e:
            print(f"\n[ERROR] {p.name}: {e}")
            errors.append((p, e))

    print(f"\n{'='*60}")
    print(f"Summary: {len(results)} succeeded, {len(errors)} failed.")
    if errors:
        for p, e in errors:
            print(f"  ✗ {p.name}: {e}")
    print("Outputs are in ./output/")


if __name__ == "__main__":
    main()

"""
Quick smoke-test for the per-system pipeline.
Run from the backend directory:
    python test_pipeline.py
"""
import sys
import os
import shutil
import json
from pathlib import Path

# Make sure we can import backend modules
sys.path.insert(0, str(Path(__file__).parent))

IMAGE_PATH = r"C:\Users\CHERISH\DEV\Assets\TrebleAI_input\fur_elise.png"
OUTPUT_DIR = str(Path(__file__).parent / "test_output" / "fur_elise_test")
BASE_NAME  = "fur_elise"

def run():
    # Clean previous run
    out = Path(OUTPUT_DIR)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    # Write a minimal status.json so _set_status() doesn't bail early
    status = {
        "status": "processing",
        "error": None,
        "steps": {
            "upload":   "completed",
            "omr":      "pending",
            "musicxml": "pending",
            "midi":     "pending",
            "audio":    "pending",
            "analysis": "pending",
        }
    }
    with open(out / "status.json", "w") as f:
        json.dump(status, f)

    print("=" * 60)
    print(f"Input : {IMAGE_PATH}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)

    from pipeline import process_image_to_audio
    result = process_image_to_audio(IMAGE_PATH, OUTPUT_DIR, BASE_NAME)

    print("\n" + "=" * 60)
    print("RESULT:")
    for k, v in result.items():
        exists = Path(v).exists()
        size   = Path(v).stat().st_size if exists else 0
        print(f"  {k}: {v}  ({'OK' if exists else 'MISSING'}, {size:,} bytes)")
    print("=" * 60)

if __name__ == "__main__":
    run()

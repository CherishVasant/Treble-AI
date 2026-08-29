import hashlib
import os
import shutil
import subprocess
from pathlib import Path

import requests as http_requests
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from music21 import stream, note, tempo

from pipeline import FLUIDSYNTH_PATH, SOUNDFONT
from reference_library import get_reference_library as load_cached_library

router = APIRouter(prefix="/reference", tags=["reference"])

# --------------------------------------------------------------------------- #
# Vercel Blob helpers                                                          #
# --------------------------------------------------------------------------- #

def _blob_token() -> str:
    return os.getenv("BLOB_READ_WRITE_TOKEN", "")


def _blob_exists(pathname: str) -> str | None:
    """Return the public URL if a blob with this pathname already exists, else None."""
    token = _blob_token()
    if not token:
        return None
    try:
        resp = http_requests.get(
            "https://api.vercel.com/v9/blob",
            params={"prefix": pathname, "limit": 1},
            headers={"Authorization": f"Bearer {token}", "x-api-version": "7"},
            timeout=10,
        )
        if not resp.ok:
            return None
        blobs = resp.json().get("blobs", [])
        # Match exact pathname (prefix search can return longer paths)
        for b in blobs:
            if b.get("pathname") == pathname:
                return b.get("url")
        return None
    except Exception as exc:
        print(f"[BlobCheck] {exc}")
        return None


def _upload_to_vercel_blob(file_path: Path, pathname: str) -> str | None:
    """Upload file_path to Vercel Blob and return the public URL, or None on failure."""
    token = _blob_token()
    if not token:
        return None
    try:
        with open(file_path, "rb") as fh:
            data = fh.read()
        resp = http_requests.put(
            "https://api.vercel.com/v9/blob",
            params={"pathname": pathname, "access": "public"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "audio/wav",
                "x-api-version": "7",
                # Disable random suffix so the stored path is exactly `pathname`,
                # making _blob_exists() able to find it on subsequent requests.
                "x-add-random-suffix": "0",
            },
            data=data,
            timeout=30,
        )
        if not resp.ok:
            print(f"[BlobUpload] HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        return resp.json().get("url")
    except Exception as exc:
        print(f"[BlobUpload] {exc}")
        return None


# --------------------------------------------------------------------------- #
# Routes                                                                       #
# --------------------------------------------------------------------------- #

@router.get("/library")
def get_reference_library() -> dict:
    return load_cached_library()


@router.get("/scale-audio")
def get_scale_audio(
    notes: str = Query(..., description="Comma-separated notes of the scale"),
):
    """Return a WAV for the requested scale, synthesising it only once ever.

    Flow:
      1. Check Vercel Blob for scale-audio/{hash}.wav — instant redirect if found.
      2. Check local filesystem (pre-generated Docker image layer for the 24 common scales).
      3. Synthesise with FluidSynth if not found locally.
      4. Upload to Vercel Blob so future requests skip synthesis entirely.
      5. Serve local file directly as fallback (no Blob token configured).
    """
    if not notes:
        raise HTTPException(status_code=400, detail="Notes parameter is required")

    notes_list = [n.strip() for n in notes.split(",") if n.strip()]
    if not notes_list:
        raise HTTPException(status_code=400, detail="Invalid notes format")

    notes_str  = ",".join(notes_list)
    notes_hash = hashlib.md5(notes_str.encode()).hexdigest()
    blob_pathname = f"scale-audio/{notes_hash}.wav"

    # ── 1. Already in Vercel Blob? ────────────────────────────────────────── #
    blob_url = _blob_exists(blob_pathname)
    if blob_url:
        return RedirectResponse(url=blob_url, status_code=302)

    # ── 2. Local filesystem (pre-baked or from a previous run) ───────────── #
    scales_dir = Path("output") / "scales"
    scales_dir.mkdir(parents=True, exist_ok=True)
    output_wav = scales_dir / f"{notes_hash}.wav"

    # ── 3. Synthesise if not on disk ─────────────────────────────────────── #
    if not output_wav.exists():
        midi_path = scales_dir / f"{notes_hash}.mid"
        try:
            s = stream.Stream()
            s.append(tempo.MetronomeMark(number=150))
            for n_name in notes_list:
                nt = note.Note(n_name)
                nt.quarterLength = 1.0
                s.append(nt)
            s.write("midi", fp=str(midi_path))

            if not shutil.which(FLUIDSYNTH_PATH) and not Path(FLUIDSYNTH_PATH).is_file():
                raise FileNotFoundError(f"FluidSynth not found at {FLUIDSYNTH_PATH}")

            result = subprocess.run(
                [FLUIDSYNTH_PATH, "-ni", "-F", str(output_wav),
                 "-r", "44100", SOUNDFONT, str(midi_path)],
                capture_output=True, text=True,
            )
            if result.returncode != 0:
                raise RuntimeError(f"FluidSynth failed: {result.stderr}")
        except Exception as exc:
            output_wav.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Scale synthesis failed: {exc}")
        finally:
            midi_path.unlink(missing_ok=True) if midi_path.exists() else None

    # ── 4. Upload to Vercel Blob for permanent storage ────────────────────── #
    blob_url = _upload_to_vercel_blob(output_wav, blob_pathname)
    if blob_url:
        return RedirectResponse(url=blob_url, status_code=302)

    # ── 5. Fallback — serve from local disk (no Blob token) ──────────────── #
    return FileResponse(
        path=str(output_wav),
        media_type="audio/wav",
        filename=f"scale_{notes_hash}.wav",
    )


@router.post("/seed-blob")
def seed_blob_audio():
    """Bulk-upload all pre-generated scale WAVs from output/scales/ to Vercel Blob.

    Call this once after configuring BLOB_READ_WRITE_TOKEN on Render.
    Idempotent — already-uploaded files are skipped.

    Returns a summary of uploaded / skipped / failed files.
    """
    if not _blob_token():
        raise HTTPException(
            status_code=503,
            detail="BLOB_READ_WRITE_TOKEN is not configured on this server."
        )

    scales_dir = Path("output") / "scales"
    if not scales_dir.exists():
        raise HTTPException(status_code=404, detail="output/scales/ directory not found.")

    wav_files = sorted(scales_dir.glob("*.wav"))
    if not wav_files:
        return {"uploaded": 0, "skipped": 0, "failed": 0, "files": []}

    uploaded, skipped, failed = 0, 0, 0
    results: list[dict] = []

    for wav in wav_files:
        notes_hash = wav.stem          # filename IS the hash (no extension)
        pathname   = f"scale-audio/{notes_hash}.wav"

        # Already in Blob? Skip.
        existing_url = _blob_exists(pathname)
        if existing_url:
            skipped += 1
            results.append({"file": wav.name, "status": "skipped", "url": existing_url})
            continue

        blob_url = _upload_to_vercel_blob(wav, pathname)
        if blob_url:
            uploaded += 1
            results.append({"file": wav.name, "status": "uploaded", "url": blob_url})
        else:
            failed += 1
            results.append({"file": wav.name, "status": "failed"})

    return {
        "uploaded": uploaded,
        "skipped":  skipped,
        "failed":   failed,
        "total":    len(wav_files),
        "files":    results,
    }

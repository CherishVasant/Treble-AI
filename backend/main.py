from contextlib import asynccontextmanager
from typing import Optional
import json
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path

import requests as http_requests
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from config import settings
from database import get_db, SessionLocal
from models import PracticeSession, AnalysisReport
from reference_library import initialize_cache
from routers.auth import router as auth_router, get_current_user, User
from routers.chats import router as chats_router
from routers.reference import router as reference_router
from routers.theory import router as theory_router
from seed import run_startup_seed


# ─────────────────────────────────────────────────────────────────────────────
# Vercel Blob helpers
# ─────────────────────────────────────────────────────────────────────────────

def _blob_token() -> str:
    return os.getenv("BLOB_READ_WRITE_TOKEN", "")


def _upload_to_blob(file_path: Path, pathname: str, content_type: str = "application/octet-stream") -> str | None:
    """Upload a file to Vercel Blob. Returns the public URL or None on failure."""
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
                "Content-Type": content_type,
                "x-api-version": "7",
            },
            data=data,
            timeout=60,
        )
        if not resp.ok:
            print(f"[Blob] Upload failed ({resp.status_code}): {resp.text[:200]}")
            return None
        return resp.json().get("url")
    except Exception as exc:
        print(f"[Blob] Upload error for {pathname}: {exc}")
        return None


def _download_from_blob(url: str, dest: Path) -> bool:
    """Download a Vercel Blob file to dest. Returns True on success."""
    try:
        resp = http_requests.get(url, timeout=30, stream=True)
        if not resp.ok:
            return False
        with open(dest, "wb") as fh:
            for chunk in resp.iter_content(chunk_size=65536):
                fh.write(chunk)
        return True
    except Exception as exc:
        print(f"[Blob] Download error from {url}: {exc}")
        return False


def _upload_processed_files(job_id: str, job_dir: Path, base_name: str) -> dict:
    """Upload MXL, MIDI and WAV pipeline outputs to Vercel Blob.

    Returns a dict with the blob URLs that were successfully uploaded
    (keys: musicxml_blob_url, midi_blob_url, audio_blob_url).
    """
    urls: dict[str, str] = {}

    files = [
        ("musicxml_blob_url", job_dir / f"{base_name}.mxl",  f"processed/{job_id}/{base_name}.mxl",  "application/octet-stream"),
        ("midi_blob_url",     job_dir / f"{base_name}.mid",  f"processed/{job_id}/{base_name}.mid",  "audio/midi"),
        ("audio_blob_url",    job_dir / f"{base_name}.wav",  f"processed/{job_id}/{base_name}.wav",  "audio/wav"),
    ]

    for url_field, local_path, pathname, content_type in files:
        if local_path.exists():
            url = _upload_to_blob(local_path, pathname, content_type)
            if url:
                urls[url_field] = url
                print(f"[Blob] Uploaded {local_path.name} → {url}")
            else:
                print(f"[Blob] Skipped {local_path.name} (upload failed or no token)")
        else:
            print(f"[Blob] File not found, skipping: {local_path}")

    return urls


# ─────────────────────────────────────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_startup_seed()
    db = SessionLocal()
    try:
        initialize_cache(db)
    finally:
        db.close()
    yield


app = FastAPI(lifespan=lifespan)

_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reference_router)
app.include_router(theory_router)
app.include_router(auth_router)
app.include_router(chats_router)


# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

def safe_folder_name(filename: str) -> str:
    name = os.path.splitext(filename)[0]
    name = re.sub(r"[^a-zA-Z0-9_-]", "_", name)
    return name


def _init_status(job_dir: Path):
    status_path = job_dir / "status.json"
    data = {
        "status": "processing",
        "error": None,
        "steps": {
            "upload": "completed",
            "omr": "pending",
            "musicxml": "pending",
            "midi": "pending",
            "audio": "pending",
            "analysis": "pending",
        }
    }
    with open(status_path, "w") as f:
        json.dump(data, f)


# ─────────────────────────────────────────────────────────────────────────────
# Background pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_background_pipeline(
    process_image_to_audio,
    temp_path: str,
    job_dir: str,
    base_name: str,
    job_id: str,
):
    job_dir_path = Path(job_dir)
    status_path = job_dir_path / "status.json"

    try:
        process_image_to_audio(temp_path, job_dir, base_name)
    except Exception as exc:
        # Mark the active step as failed in status.json
        active_step = "omr"
        if status_path.exists():
            try:
                with open(status_path) as f:
                    d = json.load(f)
                for k, v in d["steps"].items():
                    if v == "processing":
                        active_step = k
                        break
            except Exception:
                pass
        try:
            if status_path.exists():
                with open(status_path) as f:
                    data = json.load(f)
                data["status"] = "failed"
                data["error"] = str(exc)
                data["steps"][active_step] = "failed"
                with open(status_path, "w") as f:
                    json.dump(data, f)
        except Exception:
            pass
        return  # Don't proceed to blob upload on failure

    # ── Pipeline succeeded → upload output files to Vercel Blob ─────────── #
    blob_urls = _upload_processed_files(job_id, job_dir_path, base_name)

    if blob_urls:
        db = SessionLocal()
        try:
            session = db.query(PracticeSession).filter(PracticeSession.id == job_id).first()
            if session:
                for field, url in blob_urls.items():
                    setattr(session, field, url)
                db.commit()
                print(f"[Pipeline] Blob URLs saved to DB for session {job_id}")
        except Exception as exc:
            db.rollback()
            print(f"[Pipeline] Failed to save blob URLs to DB: {exc}")
        finally:
            db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "TrebleAI backend is running"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"status": "error", "database": "disconnected", "error": str(exc)}
        )


def _get_pipeline_runner():
    try:
        from pipeline import process_image_to_audio
        return process_image_to_audio
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Sheet music pipeline is not installed: {exc}. Run: pip install -r requirements.txt",
        ) from exc


@app.post("/process")
async def process_sheet_music(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    blob_url: Optional[str] = Form(None),
    original_name: Optional[str] = Form(None),
    # The frontend can pre-generate a UUID so the session ID is known before
    # the backend responds — this eliminates the need to migrate session IDs.
    client_session_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    process_image_to_audio = _get_pipeline_runner()

    display_filename = original_name or file.filename or "upload"

    # Use the client-supplied UUID when provided; otherwise generate one.
    session_uuid = client_session_id if client_session_id else str(uuid.uuid4())
    storage_directory = f"uploads/{session_uuid}"
    job_dir = Path(storage_directory)
    job_dir.mkdir(parents=True, exist_ok=True)

    base_name = safe_folder_name(display_filename)
    temp_path = job_dir / display_filename
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    session_title = base_name.replace("_", " ").capitalize()

    # --- Session upsert: update existing row on re-conversion, insert for new sessions ---
    existing_session = (
        db.query(PracticeSession).filter(PracticeSession.id == session_uuid).first()
        if client_session_id else None
    )

    if existing_session:
        if existing_session.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        # Re-conversion of an existing session: clear stale pipeline outputs so
        # the new run writes fresh blob URLs when it completes.
        existing_session.original_filename = display_filename
        existing_session.storage_directory = storage_directory
        existing_session.blob_url = blob_url or existing_session.blob_url
        existing_session.musicxml_blob_url = None
        existing_session.midi_blob_url = None
        existing_session.audio_blob_url = None
        db.commit()
    else:
        new_session = PracticeSession(
            id=session_uuid,
            user_id=current_user.id,
            title=session_title,
            original_filename=display_filename,
            storage_directory=storage_directory,
            blob_url=blob_url or None,
        )
        db.add(new_session)
        db.commit()

    _init_status(job_dir)

    background_tasks.add_task(
        run_background_pipeline,
        process_image_to_audio,
        str(temp_path),
        str(job_dir),
        base_name,
        session_uuid,
    )

    return {"jobId": session_uuid, "status": "processing", "message": "Conversion started in background"}


@app.get("/result/{job_id}/status")
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
):
    # Auth is intentionally omitted here.  The job_id is a UUID4 (2^122 space)
    # which already acts as an unguessable token.  Requiring a JWT means status
    # polls 401 whenever the access token expires mid-conversion (tokens are
    # short-lived) and permanently after a Render restart wipes in-memory
    # sessions — both cases cause the frontend to show "Could not reach server".
    # The content endpoints (/audio, /musicxml, etc.) still require auth.
    session = db.query(PracticeSession).filter(PracticeSession.id == job_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")

    status_path = Path(session.storage_directory) / "status.json"
    if not status_path.exists():
        # If blob URLs are set, the pipeline definitely completed even if status.json is gone
        if session.audio_blob_url:
            return {
                "status": "completed",
                "error": None,
                "steps": {k: "completed" for k in ["upload", "omr", "musicxml", "midi", "audio", "analysis"]},
            }
        return {
            "status": "processing",
            "error": None,
            "steps": {
                "upload": "completed",
                "omr": "pending",
                "musicxml": "pending",
                "midi": "pending",
                "audio": "pending",
                "analysis": "pending",
            },
        }
    try:
        with open(status_path) as f:
            return json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/result/{job_id}/audio")
def get_audio(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(PracticeSession).filter(PracticeSession.id == job_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # Prefer permanent Vercel Blob URL (survives restarts)
    if session.audio_blob_url:
        return RedirectResponse(url=session.audio_blob_url, status_code=302)

    # Fallback: serve from local filesystem (first run, or no Blob token)
    base_name = safe_folder_name(session.original_filename)
    audio_path = Path(session.storage_directory) / f"{base_name}.wav"
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found. The server may have restarted — please re-convert.")
    return FileResponse(path=str(audio_path), media_type="audio/wav", filename=f"{base_name}.wav")


@app.get("/result/{job_id}/musicxml")
def get_musicxml(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(PracticeSession).filter(PracticeSession.id == job_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    if session.musicxml_blob_url:
        return RedirectResponse(url=session.musicxml_blob_url, status_code=302)

    base_name = safe_folder_name(session.original_filename)
    mxl_path = Path(session.storage_directory) / f"{base_name}.mxl"
    if not mxl_path.exists():
        raise HTTPException(status_code=404, detail="MusicXML file not found. The server may have restarted — please re-convert.")
    return FileResponse(path=str(mxl_path), media_type="application/octet-stream", filename=f"{base_name}.mxl")


@app.get("/result/{job_id}/original")
def get_original_file(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(PracticeSession).filter(PracticeSession.id == job_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # Original upload is stored in Vercel Blob from the moment the user picks the file
    if session.blob_url:
        return RedirectResponse(url=session.blob_url, status_code=302)

    # Fallback: serve from local disk
    original_path = Path(session.storage_directory) / session.original_filename
    if not original_path.exists():
        raise HTTPException(status_code=404, detail="Original file not found. The server may have restarted — please re-upload.")

    fn = session.original_filename.lower()
    if fn.endswith(".pdf"):
        mime = "application/pdf"
    elif fn.endswith((".jpg", ".jpeg")):
        mime = "image/jpeg"
    elif fn.endswith(".webp"):
        mime = "image/webp"
    else:
        mime = "image/png"

    return FileResponse(path=str(original_path), media_type=mime, filename=session.original_filename)


# ─────────────────────────────────────────────────────────────────────────────
# Musical info (analysis)
# ─────────────────────────────────────────────────────────────────────────────

def extract_musical_info(mxl_path: Path) -> dict:
    """Parse a local MXL file and return the full analysis dict."""
    # 1. Try the cached analysis_report.json written by the pipeline
    report_path = mxl_path.parent / "analysis_report.json"
    if report_path.exists():
        try:
            with open(report_path, encoding="utf-8") as f:
                report = json.load(f)
            if "error" not in report or len(report) > 1:
                return report
        except Exception as err:
            print(f"[extract_musical_info] Error reading cached report: {err}")

    # 2. Generate on-the-fly
    try:
        from music.analysis import analyze_score
        print(f"[extract_musical_info] Generating analysis on-the-fly for {mxl_path}…")
        report = analyze_score(str(mxl_path))
        try:
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
        except Exception:
            pass
        return report
    except Exception as e:
        print(f"[extract_musical_info] On-the-fly analysis failed: {e}")

    # 3. Minimal fallback using music21 directly
    from music21 import converter, key, meter, tempo, note, chord
    info: dict = {
        "title": "", "composer": "", "key_signature": "Unknown",
        "time_signature": "Unknown", "tempo": "Unknown",
        "total_measures": 0, "parts": [], "note_summary": "",
    }
    try:
        score = converter.parse(str(mxl_path))
        if score.metadata:
            info["title"] = score.metadata.title or ""
            info["composer"] = score.metadata.composer or ""
        keys = score.flat.getElementsByClass(key.KeySignature)
        if keys:
            try:
                info["key_signature"] = f"{keys[0].asKey().name} ({keys[0].sharps} sharps/flats)"
            except Exception:
                info["key_signature"] = f"{keys[0].sharps} sharps/flats"
        else:
            try:
                info["key_signature"] = f"{score.analyze('key').name} (deduced)"
            except Exception:
                pass
        times = score.flat.getElementsByClass(meter.TimeSignature)
        if times:
            info["time_signature"] = times[0].ratioString
        tempos = score.flat.getElementsByClass(tempo.MetronomeMark)
        if tempos and tempos[0].number and tempos[0].number > 0:
            info["tempo"] = f"{int(tempos[0].number)} bpm"
        else:
            info["tempo"] = "120 bpm"
        for part in score.parts:
            pi = {"name": part.partName or "Unknown Part", "measures_count": len(part.getElementsByClass("Measure"))}
            info["parts"].append(pi)
            if not info["total_measures"]:
                info["total_measures"] = pi["measures_count"]
        note_seq = []
        for nc in list(score.flat.notes)[:100]:
            if isinstance(nc, note.Note):
                note_seq.append(f"{nc.nameWithOctave} ({nc.duration.quarterLength} beats)")
            elif isinstance(nc, chord.Chord):
                note_seq.append(f"Chord:{'+'.join(p.nameWithOctave for p in nc.pitches)} ({nc.duration.quarterLength} beats)")
        info["note_summary"] = ", ".join(note_seq)

        note_events = []
        try:
            # Guard: music21's secondsMap divides by tempo internally.
            # If the score has no MetronomeMark or tempo=0, inject a default
            # before calling flatten().secondsMap to prevent ZeroDivisionError.
            _sm_tempos = score.flat.getElementsByClass(tempo.MetronomeMark)
            if not _sm_tempos or not _sm_tempos[0].number or _sm_tempos[0].number <= 0:
                score.insert(0, tempo.MetronomeMark(number=120))
            for entry in score.flatten().secondsMap:
                el = entry.get("element")
                start = float(entry.get("offsetSeconds") or 0)
                dur = float(entry.get("durationSeconds") or 0)
                if isinstance(el, note.Note):
                    note_events.append({"start": start, "duration": dur, "midi": int(el.pitch.midi)})
                elif isinstance(el, chord.Chord):
                    for p in el.pitches:
                        note_events.append({"start": start, "duration": dur, "midi": int(p.midi)})
        except Exception:
            pass
        info["notes"] = note_events

        measures_map = []
        try:
            try:
                expanded = score.expandRepeats()
            except Exception:
                expanded = score
            tv = (expanded.flat.getElementsByClass(tempo.MetronomeMark) or [None])[0]
            tempo_val = (tv.number if tv else None) or 120
            tempo_val = tempo_val if tempo_val > 0 else 120
            spb = 60.0 / tempo_val
            parts = expanded.parts
            if parts:
                for idx, m in enumerate(parts[0].getElementsByClass("Measure")):
                    measures_map.append({
                        "measure_index": idx,
                        "measure_number": int(m.number),
                        "start_time": float(m.offset * spb),
                        "end_time": float((m.offset + m.quarterLength) * spb),
                    })
        except Exception as me:
            print(f"[extract_musical_info] measures_map error: {me}")
        info["measures_map"] = measures_map
    except Exception as e:
        info["error"] = f"Failed to parse musical details: {e}"
    return info


@app.get("/result/{job_id}/musical-info")
def get_musical_info(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(PracticeSession).filter(PracticeSession.id == job_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # ── 1. DB cache — always present after the first successful call ──────── #
    report_record = db.query(AnalysisReport).filter(AnalysisReport.practice_session_id == job_id).first()
    if report_record:
        return report_record.analysis_json

    # ── 2. Locate MXL — prefer local disk, fall back to Blob download ─────── #
    base_name = safe_folder_name(session.original_filename)
    mxl_path = Path(session.storage_directory) / f"{base_name}.mxl"

    # If local file is gone (server restart) but blob URL is available, download it
    if not mxl_path.exists() and session.musicxml_blob_url:
        print(f"[musical-info] Local MXL missing; downloading from Blob for session {job_id}")
        mxl_path.parent.mkdir(parents=True, exist_ok=True)
        if not _download_from_blob(session.musicxml_blob_url, mxl_path):
            raise HTTPException(
                status_code=503,
                detail="MusicXML file unavailable. Please re-convert the sheet music.",
            )

    if not mxl_path.exists():
        raise HTTPException(status_code=404, detail="MusicXML file not found. Please re-convert.")

    report = extract_musical_info(mxl_path)

    # ── 3. Cache analysis in DB so future requests skip parsing ───────────── #
    if report and "error" not in report:
        notes_text = None
        try:
            from music.analysis import extract_notes_text
            notes_text = extract_notes_text(str(mxl_path))
        except Exception as exc:
            print(f"[AnalysisReport] notes_text extraction failed: {exc}")
        try:
            db.add(AnalysisReport(
                id=str(uuid.uuid4()),
                practice_session_id=job_id,
                analysis_json=report,
                notes_text=notes_text,
            ))
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"[AnalysisReport] DB save failed: {exc}")

    return report


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

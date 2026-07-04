from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from database import get_db
from sqlalchemy.orm import Session
import shutil
import os
import uuid
import re
from pathlib import Path

from config import settings
from routers.reference import router as reference_router
from routers.theory import router as theory_router
from seed import run_startup_seed
from database import SessionLocal
from reference_library import initialize_cache


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


def safe_folder_name(filename: str) -> str:
    name = os.path.splitext(filename)[0]
    name = re.sub(r"[^a-zA-Z0-9_-]", "_", name)
    return name


from sqlalchemy import text


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


import json

def _init_status(job_id: str):
    status_path = Path("output") / job_id / "status.json"
    data = {
        "status": "processing",
        "error": None,
        "steps": {
            "upload": "completed",
            "omr": "pending",
            "musicxml": "pending",
            "midi": "pending",
            "audio": "pending",
            "analysis": "pending"
        }
    }
    with open(status_path, "w") as f:
        json.dump(data, f)

def run_background_pipeline(process_image_to_audio, temp_path: str, job_dir: str, base_name: str, job_id: str):
    try:
        process_image_to_audio(temp_path, job_dir, base_name)
    except Exception as exc:
        status_path = Path("output") / job_id / "status.json"
        active_step = "omr"
        if status_path.exists():
            try:
                with open(status_path, "r") as f:
                    d = json.load(f)
                    for k, v in d["steps"].items():
                        if v == "processing":
                            active_step = k
                            break
            except Exception:
                pass
        
        try:
            if status_path.exists():
                with open(status_path, "r") as f:
                    data = json.load(f)
                data["status"] = "failed"
                data["error"] = str(exc)
                data["steps"][active_step] = "failed"
                with open(status_path, "w") as f:
                    json.dump(data, f)
        except Exception:
            pass


@app.post("/process")
async def process_sheet_music(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    process_image_to_audio = _get_pipeline_runner()

    base_name = safe_folder_name(file.filename or "upload")
    job_id = f"{base_name}_{uuid.uuid4().hex[:6]}"

    job_dir = Path("output") / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    temp_path = job_dir / (file.filename or "upload.bin")
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    _init_status(job_id)

    background_tasks.add_task(
        run_background_pipeline, process_image_to_audio, str(temp_path), str(job_dir), base_name, job_id
    )

    return {"job_id": job_id}


@app.get("/result/{job_id}/status")
def get_job_status(job_id: str):
    status_path = Path("output") / job_id / "status.json"
    if not status_path.exists():
        return {
            "status": "processing",
            "error": None,
            "steps": {
                "upload": "completed",
                "omr": "pending",
                "musicxml": "pending",
                "midi": "pending",
                "audio": "pending",
                "analysis": "pending"
            }
        }
    try:
        with open(status_path, "r") as f:
            return json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/result/{job_id}/audio")
def get_audio(job_id: str):
    audio_path = Path("output") / job_id / f"{job_id.rsplit('_', 1)[0]}.wav"

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename="output.wav",
    )


@app.get("/result/{job_id}/musicxml")
def get_musicxml(job_id: str):
    mxl_path = Path("output") / job_id / f"{job_id.rsplit('_', 1)[0]}.mxl"

    if not mxl_path.exists():
        raise HTTPException(status_code=404, detail="MusicXML file not found")

    return FileResponse(
        path=str(mxl_path),
        media_type="application/octet-stream",
        filename="output.mxl",
    )


def extract_musical_info(mxl_path: Path) -> dict:
    # 1. Try to load from cached analysis_report.json in the same directory
    report_path = mxl_path.parent / "analysis_report.json"
    if report_path.exists():
        try:
            with open(report_path, "r", encoding="utf-8") as f:
                report = json.load(f)
            if "error" not in report or len(report) > 1:
                return report
        except Exception as err:
            print(f"[extract_musical_info] Error reading cached analysis report: {err}")

    from music21 import converter, key, meter, tempo, note, chord
    
    info = {
        "title": "",
        "composer": "",
        "key_signature": "Unknown",
        "time_signature": "Unknown",
        "tempo": "Unknown",
        "total_measures": 0,
        "parts": [],
        "note_summary": "",
    }
    
    try:
        score = converter.parse(str(mxl_path))
        
        # Metadata
        if score.metadata:
            info["title"] = score.metadata.title or ""
            info["composer"] = score.metadata.composer or ""
            
        # Key signature
        keys = score.flat.getElementsByClass(key.KeySignature)
        if keys:
            first_key = keys[0]
            try:
                info["key_signature"] = f"{first_key.asKey().name} ({first_key.sharps} sharps/flats)"
            except Exception:
                info["key_signature"] = f"{first_key.sharps} sharps/flats"
        else:
            try:
                analyzed_key = score.analyze('key')
                info["key_signature"] = f"{analyzed_key.name} (deduced)"
            except Exception:
                pass

        # Time signature
        times = score.flat.getElementsByClass(meter.TimeSignature)
        if times:
            info["time_signature"] = times[0].ratioString
            
        # Tempo
        tempos = score.flat.getElementsByClass(tempo.MetronomeMark)
        if tempos:
            info["tempo"] = f"{tempos[0].number} bpm"
            
        # Parts / Instruments
        for part in score.parts:
            part_info = {
                "name": part.partName or "Unknown Part",
                "measures_count": len(part.getElementsByClass('Measure')),
            }
            info["parts"].append(part_info)
            if not info["total_measures"]:
                info["total_measures"] = part_info["measures_count"]
                
        # Note / Chord Summary (limit to 100 notes/chords)
        notes_and_chords = score.flat.notes
        note_sequence = []
        for nc in list(notes_and_chords)[:100]:
            if isinstance(nc, note.Note):
                note_sequence.append(f"{nc.nameWithOctave} ({nc.duration.quarterLength} beats)")
            elif isinstance(nc, chord.Chord):
                pitches = [p.nameWithOctave for p in nc.pitches]
                note_sequence.append(f"Chord:{'+'.join(pitches)} ({nc.duration.quarterLength} beats)")
        
        if note_sequence:
            info["note_summary"] = ", ".join(note_sequence)
            
        # Extract precise note timing events for interactive visualization
        note_events = []
        try:
            flat_score = score.flatten()
            for entry in flat_score.secondsMap:
                el = entry.get('element')
                offset_sec = entry.get('offsetSeconds')
                dur_sec = entry.get('durationSeconds')
                start_val = float(offset_sec) if offset_sec is not None else 0.0
                dur_val = float(dur_sec) if dur_sec is not None else 0.0
                
                if isinstance(el, note.Note):
                    note_events.append({
                        "start": start_val,
                        "duration": dur_val,
                        "midi": int(el.pitch.midi)
                    })
                elif isinstance(el, chord.Chord):
                    for p in el.pitches:
                        note_events.append({
                            "start": start_val,
                            "duration": dur_val,
                            "midi": int(p.midi)
                        })
        except Exception as se:
            print(f"[extract_musical_info] Error calculating secondsMap: {se}")
            
        info["notes"] = note_events
            
    except Exception as e:
        info["error"] = f"Failed to parse musical details: {str(e)}"
        
    return info


@app.get("/result/{job_id}/musical-info")
def get_musical_info(job_id: str):
    mxl_path = Path("output") / job_id / f"{job_id.rsplit('_', 1)[0]}.mxl"

    if not mxl_path.exists():
        raise HTTPException(status_code=404, detail="MusicXML file not found")

    return extract_musical_info(mxl_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

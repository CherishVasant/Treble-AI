from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pipeline import process_image_to_audio
import shutil, os, uuid, re
from pathlib import Path

app = FastAPI()

# CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def safe_folder_name(filename: str) -> str:
    name = os.path.splitext(filename)[0]
    name = re.sub(r"[^a-zA-Z0-9_-]", "_", name)
    return name


@app.get("/")
def root():
    return {"message": "TrebleAI backend is running"}


@app.post("/process")
async def process_sheet_music(file: UploadFile = File(...)):
    base_name = safe_folder_name(file.filename)
    job_id = f"{base_name}_{uuid.uuid4().hex[:6]}"

    job_dir = Path("output") / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    temp_path = job_dir / file.filename
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    process_image_to_audio(str(temp_path), str(job_dir), base_name)

    return {"job_id": job_id}


@app.get("/result/{job_id}/audio")
def get_audio(job_id: str):
    audio_path = Path("output") / job_id / f"{job_id.rsplit('_', 1)[0]}.wav"

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename="output.wav"
    )


@app.get("/result/{job_id}/musicxml")
def get_musicxml(job_id: str):
    mxl_path = Path("output") / job_id / f"{job_id.rsplit('_', 1)[0]}.mxl"

    if not mxl_path.exists():
        raise HTTPException(status_code=404, detail="MusicXML file not found")

    return FileResponse(
        path=str(mxl_path),
        media_type="application/octet-stream",
        filename="output.mxl"
    )
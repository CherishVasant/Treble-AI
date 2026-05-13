from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
import shutil, os

app = FastAPI()

@app.get("/")
def root():
    return {"message": "TrebleAI backend is running"}

@app.post("/process")
async def process_sheet_music(file: UploadFile = File(...)):
    
    # Save the uploaded file temporarily
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"received": file.filename, "size": os.path.getsize(temp_path)}
import os
import re
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import TheoryTutorChat, TheoryTutorMessage, PracticeSession, PracticeChat, PracticeMessage
from routers.auth import get_current_user, User

router = APIRouter(prefix="/chats", tags=["chats"])


def _safe_folder_name(filename: str) -> str:
    """Mirror of main.py safe_folder_name — sanitizes a filename stem for filesystem paths."""
    name = os.path.splitext(filename)[0]
    name = re.sub(r"[^a-zA-Z0-9_-]", "_", name)
    return name


class RenameChatPayload(BaseModel):
    title: str


# --- Theory Tutor Chat Endpoints ---

@router.get("/theory")
def get_theory_chats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chats = (
        db.query(TheoryTutorChat)
        .filter(TheoryTutorChat.user_id == current_user.id)
        .order_by(TheoryTutorChat.updated_at.desc())
        .all()
    )
    result = []
    for chat in chats:
        result.append({
            "id": chat.id,
            "title": chat.title,
            "timestamp": chat.updated_at.isoformat(),
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.message,
                    "timestamp": msg.created_at.isoformat()
                }
                for msg in chat.messages
            ]
        })
    return result


@router.put("/theory/{chat_id}")
def rename_theory_chat(
    chat_id: str,
    payload: RenameChatPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(TheoryTutorChat).filter(TheoryTutorChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this chat")
    
    chat.title = payload.title
    db.commit()
    return {"message": "Chat renamed successfully", "title": chat.title}


@router.delete("/theory/{chat_id}")
def delete_theory_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(TheoryTutorChat).filter(TheoryTutorChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this chat")
    
    db.delete(chat)
    db.commit()
    return {"message": "Chat deleted successfully"}


# --- Practice Studio Session Endpoints ---

@router.get("/practice")
def get_practice_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = (
        db.query(PracticeSession)
        .filter(PracticeSession.user_id == current_user.id)
        .order_by(PracticeSession.updated_at.desc())
        .all()
    )
    result = []
    for session in sessions:
        # Load messages from PracticeChat associated with this PracticeSession
        messages_list = []
        if session.chat:
            messages_list = [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.message,
                    "timestamp": msg.created_at.isoformat()
                }
                for msg in session.chat.messages
            ]

        # Extract file variables
        original_name = session.original_filename
        storage_dir = session.storage_directory

        # Chat-only sessions (created when the user chats without uploading a file)
        # have an empty original_filename (new) or "Piano Practice" (legacy).
        # Don't expose fake file metadata for them.
        is_chat_only = not original_name or original_name == "Piano Practice"

        if is_chat_only:
            result.append({
                "id": session.id,
                "title": session.title,
                "timestamp": session.updated_at.isoformat(),
                "uploadedFileData": None,
                "processedMetadata": None,
                "messages": messages_list
            })
            continue

        # Calculate Preview Type & URLs
        preview_kind = "pdf" if original_name.lower().endswith(".pdf") else "image"
        preview_url = f"/api/upload/{session.id}"

        # Only return audio/musicxml URLs when the output files actually exist so
        # hasAudio is accurate and the uploader shows the correct "Convert" state.
        # Prefer Vercel Blob (survives Render restarts); fall back to local disk.
        base_safe = _safe_folder_name(original_name)

        audio_url = None
        if session.audio_blob_url:
            audio_url = f"/api/audio/{session.id}"
        else:
            local_wav = Path(session.storage_directory) / f"{base_safe}.wav"
            if local_wav.exists():
                audio_url = f"/api/audio/{session.id}"

        musicxml_url = None
        if session.musicxml_blob_url:
            musicxml_url = f"/api/musicxml/{session.id}"
        else:
            local_mxl = Path(session.storage_directory) / f"{base_safe}.mxl"
            if local_mxl.exists():
                musicxml_url = f"/api/musicxml/{session.id}"

        result.append({
            "id": session.id,
            "title": session.title,
            "timestamp": session.updated_at.isoformat(),
            "uploadedFileData": {
                "id": session.id,
                "name": original_name,
                # blob_url lets the frontend re-convert without a fresh upload
                "blobUrl": session.blob_url or None,
            },
            "processedMetadata": {
                "jobId": session.id,
                "audioUrl": audio_url,
                "musicXmlUrl": musicxml_url,
                "previewUrl": preview_url,
                "previewKind": preview_kind,
                "metadata": {
                    "title": session.title,
                    "composer": "Unknown"
                },
                "musicalInfo": session.analysis.analysis_json if session.analysis else None
            },
            "messages": messages_list
        })
    return result


@router.put("/practice/{session_id}")
def rename_practice_session(
    session_id: str,
    payload: RenameChatPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this session")
    
    session.title = payload.title
    db.commit()
    return {"message": "Practice session renamed successfully", "title": session.title}


@router.delete("/practice/{session_id}")
def delete_practice_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")

    # Clean up disk files first
    storage_dir_str = session.storage_directory
    try:
        storage_path = Path(storage_dir_str)
        if storage_path.exists() and storage_path.is_dir():
            shutil.rmtree(storage_path)
    except Exception as exc:
        # Log error, but continue database delete
        print(f"[Cleanups] Warning: Failed to clean up folder {storage_dir_str}: {exc}")

    # Hard delete database row
    db.delete(session)
    db.commit()
    return {"message": "Practice session deleted successfully"}

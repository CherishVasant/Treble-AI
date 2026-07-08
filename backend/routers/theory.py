import uuid
import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import jwt

from services.agent import AgentService
from schemas import TheoryChatRequest, TheoryChatResponse
from database import get_db
from models import User, TheoryTutorChat, TheoryTutorMessage, PracticeSession, PracticeChat, PracticeMessage
from routers.auth import get_current_user
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings

router = APIRouter(prefix="/theory", tags=["theory"])


def generate_llm_title(first_msg: str, second_msg: str) -> str:
    try:
        if not settings.openrouter_api_key:
            return first_msg[:40] + ("..." if len(first_msg) > 40 else "")
        llm = ChatOpenAI(
            model=settings.theory_llm_model,
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.7,
            default_headers={
                "HTTP-Referer": "https://github.com/Treble-AI",
                "X-Title": "Treble AI",
            }
        )
        prompt = (
            "Summarize the following two queries into a concise, professional music study title of 3-5 words. "
            "Do not include quotes, punctuation, or Markdown bold/italics. Just return the raw words.\n"
            f"Query 1: {first_msg}\n"
            f"Query 2: {second_msg}"
        )
        res = llm.invoke([SystemMessage(content="You are a helpful assistant."), HumanMessage(content=prompt)])
        title = res.content.strip().replace('"', '').replace("'", "")
        return title if title else (first_msg[:40] + ("..." if len(first_msg) > 40 else ""))
    except Exception as exc:
        print(f"[Title Gen] Error generating title: {exc}")
        return first_msg[:40] + ("..." if len(first_msg) > 40 else "")


@router.post("/chat", response_model=TheoryChatResponse)
def theory_chat(
    body: TheoryChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> TheoryChatResponse:
    """
    Music theory assistant using shared AgentService with database persistence.
    """
    chat_id = body.sessionId
    chat_type = body.chatType or "theory"
    
    practice_chat_record = None
    theory_chat_record = None
    
    if chat_id:
        try:
            if chat_type == "theory":
                theory_chat_record = db.query(TheoryTutorChat).filter(TheoryTutorChat.id == chat_id).first()
                if not theory_chat_record:
                    initial_title = body.message[:40] + ("..." if len(body.message) > 40 else "")
                    theory_chat_record = TheoryTutorChat(
                        id=chat_id,
                        user_id=current_user.id,
                        title=initial_title
                    )
                    db.add(theory_chat_record)
                    db.flush()
                else:
                    if theory_chat_record.user_id != current_user.id:
                        raise HTTPException(status_code=403, detail="Not authorized to edit this chat")
                
                user_msg = TheoryTutorMessage(
                    id=str(uuid.uuid4()),
                    chat_id=chat_id,
                    role="user",
                    message=body.message
                )
                db.add(user_msg)
                db.commit()
                
                user_messages = (
                    db.query(TheoryTutorMessage)
                    .filter(TheoryTutorMessage.chat_id == chat_id, TheoryTutorMessage.role == "user")
                    .order_by(TheoryTutorMessage.created_at.asc())
                    .all()
                )
                if len(user_messages) == 2:
                    new_title = generate_llm_title(user_messages[0].message, user_messages[1].message)
                    theory_chat_record.title = new_title
                    db.commit()
                    
            elif chat_type == "practice":
                session = db.query(PracticeSession).filter(PracticeSession.id == chat_id).first()
                if not session:
                    raise HTTPException(status_code=404, detail="Practice session not found")
                if session.user_id != current_user.id:
                    raise HTTPException(status_code=403, detail="Not authorized to access this session")
                    
                practice_chat_record = db.query(PracticeChat).filter(PracticeChat.practice_session_id == chat_id).first()
                if not practice_chat_record:
                    practice_chat_record = PracticeChat(
                        id=str(uuid.uuid4()),
                        practice_session_id=chat_id
                    )
                    db.add(practice_chat_record)
                    db.flush()
                    
                user_msg = PracticeMessage(
                    id=str(uuid.uuid4()),
                    practice_chat_id=practice_chat_record.id,
                    role="user",
                    message=body.message
                )
                db.add(user_msg)
                db.commit()
        except HTTPException:
            db.rollback()
            raise
        except Exception as db_exc:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error saving message: {str(db_exc)}")

    try:
        res = AgentService.run_agent(
            message=body.message,
            context=body.context,
            system_prompt=body.system_prompt,
            history=[{"role": h.role, "content": h.content} for h in body.history]
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
        
    if chat_id and res["success"]:
        try:
            if chat_type == "theory" and theory_chat_record:
                assistant_msg = TheoryTutorMessage(
                    id=str(uuid.uuid4()),
                    chat_id=chat_id,
                    role="assistant",
                    message=res["response"]
                )
                theory_chat_record.updated_at = datetime.datetime.now(datetime.timezone.utc)
                db.add(assistant_msg)
                db.commit()
            elif chat_type == "practice" and practice_chat_record:
                assistant_msg = PracticeMessage(
                    id=str(uuid.uuid4()),
                    practice_chat_id=practice_chat_record.id,
                    role="assistant",
                    message=res["response"]
                )
                session = db.query(PracticeSession).filter(PracticeSession.id == chat_id).first()
                if session:
                    session.updated_at = datetime.datetime.now(datetime.timezone.utc)
                db.add(assistant_msg)
                db.commit()
        except Exception as db_exc:
            db.rollback()
            print(f"[Database Error] Failed to save assistant message: {db_exc}")
            
    return TheoryChatResponse(
        response=res["response"],
        success=res["success"],
        suggested_follow_up_questions=res["suggested_follow_up_questions"],
        related_concepts=res["related_concepts"],
        citations=res["citations"],
        agent_steps=res["agent_steps"]
    )

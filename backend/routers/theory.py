from fastapi import APIRouter, HTTPException
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from config import get_settings
from schemas import TheoryChatRequest, TheoryChatResponse

router = APIRouter(prefix="/theory", tags=["theory"])


@router.post("/chat", response_model=TheoryChatResponse)
def theory_chat(body: TheoryChatRequest) -> TheoryChatResponse:
    """
    Music theory assistant using LangChain's ChatOpenAI with OpenRouter.
    Set OPENROUTER_API_KEY and optionally THEORY_LLM_MODEL (default: openai/gpt-oss-120b:free).
    """
    settings = get_settings()
    api_key = (settings.openrouter_api_key or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENROUTER_API_KEY is not configured on the Python backend. Add it to backend/.env and restart the backend server.",
        )

    json_instructions = (
        "\n\nYou MUST respond ONLY with a valid JSON object. Do not include any conversational text or markdown code blocks (like ```json) outside the JSON. "
        "The JSON object must have exactly the following structure:\n"
        "{\n"
        '  "response": "Your detailed tutor answer in Markdown format (use headings, lists, bold, italics, tables, and code blocks as needed). Support music notation formatting (like sharps/flats).",\n'
        '  "suggested_follow_up_questions": ["Question 1?", "Question 2?", "Question 3?"],\n'
        '  "related_concepts": ["Concept A", "Concept B", "Concept C"],\n'
        '  "citations": ["Reference Source A", "Reference Source B"]\n'
        "}"
    )
    
    system_parts = [body.system_prompt.strip(), json_instructions]
    if body.context.strip():
        system_parts.append(f"Context from the app:\n{body.context.strip()}")
    system_content = "\n\n".join(system_parts)

    messages: list = [SystemMessage(content=system_content)]
    for h in body.history:
        if h.role == "user":
            messages.append(HumanMessage(content=h.content))
        elif h.role == "assistant":
            messages.append(AIMessage(content=h.content))
    messages.append(HumanMessage(content=body.message))

    llm = ChatOpenAI(
        model=settings.theory_llm_model,
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0.7,
        default_headers={
            "HTTP-Referer": "https://github.com/Treble-AI",
            "X-Title": "Treble AI",
        }
    )

    try:
        result = llm.invoke(messages)
    except Exception as exc:  # pragma: no cover
        message = str(exc)
        if "insufficient_quota" in message or "429" in message or "credit" in message:
            raise HTTPException(
                status_code=402,
                detail="OpenRouter API quota/credits exceeded. Check billing at https://openrouter.ai/keys",
            ) from exc
        raise HTTPException(status_code=502, detail=f"LLM request failed: {message}") from exc

    text = result.content if hasattr(result, "content") else str(result)
    
    import json
    response_text = str(text)
    suggested = []
    concepts = []
    citations = []
    
    try:
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        data = json.loads(cleaned)
        response_text = data.get("response", response_text)
        suggested = data.get("suggested_follow_up_questions", [])
        concepts = data.get("related_concepts", [])
        citations = data.get("citations", [])
    except Exception as e:
        print("[theory router] JSON parse fallback. Error:", e)
        # fallback defaults
        response_text = text
        
    return TheoryChatResponse(
        response=response_text,
        success=True,
        suggested_follow_up_questions=suggested,
        related_concepts=concepts,
        citations=citations
    )

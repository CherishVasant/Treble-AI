from fastapi import APIRouter, HTTPException
from services.agent import AgentService
from schemas import TheoryChatRequest, TheoryChatResponse

router = APIRouter(prefix="/theory", tags=["theory"])


@router.post("/chat", response_model=TheoryChatResponse)
def theory_chat(body: TheoryChatRequest) -> TheoryChatResponse:
    """
    Music theory assistant using shared AgentService with tool calling support.
    """
    try:
        res = AgentService.run_agent(
            message=body.message,
            context=body.context,
            system_prompt=body.system_prompt,
            history=body.history
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
        
    return TheoryChatResponse(
        response=res["response"],
        success=res["success"],
        suggested_follow_up_questions=res["suggested_follow_up_questions"],
        related_concepts=res["related_concepts"],
        citations=res["citations"],
        agent_steps=res["agent_steps"]
    )

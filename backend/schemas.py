from pydantic import BaseModel, ConfigDict, Field


class ChatMessageIn(BaseModel):
    role: str
    content: str


class TheoryChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    context: str = ""
    system_prompt: str = "You are a helpful music theory tutor."
    history: list[ChatMessageIn] = Field(default_factory=list)


class TheoryChatResponse(BaseModel):
    response: str
    success: bool = True
    suggested_follow_up_questions: list[str] | None = None
    related_concepts: list[str] | None = None
    citations: list[str] | None = None


class ReferenceEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    formula: str | None = None
    notes: list[str] | None = None
    intervals: list[str] | None = None


class ReferenceSectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    description: str | None = None
    entries: list[ReferenceEntryOut]


class ReferenceLibraryOut(BaseModel):
    sections: list[ReferenceSectionOut]

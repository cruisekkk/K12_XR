from pydantic import BaseModel
from typing import Optional


class GenerateRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    grade_level: Optional[str] = None
    subject: Optional[str] = None


class GenerateResponse(BaseModel):
    run_id: str
    session_id: str


class SessionResponse(BaseModel):
    id: str
    prompt: str
    run_id: str
    status: str
    grade_level: Optional[str] = None
    subject: Optional[str] = None
    refined_prompt: Optional[str] = None
    image_url: Optional[str] = None
    model_url: Optional[str] = None
    annotations: list[dict] = []
    educational_content: Optional[dict] = None
    created_at: str
    updated_at: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None

import uuid
from urllib.parse import unquote
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import httpx

from app.models.schemas import (
    GenerateRequest,
    GenerateResponse,
    SessionResponse,
    ErrorResponse,
)
from app.orchestrator.pipeline import pipeline_orchestrator
from app.store.memory import session_store

router = APIRouter(prefix="/api")


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """Start the multi-agent pipeline to generate XR content."""
    session_id = request.session_id or str(uuid.uuid4())

    run_id = await pipeline_orchestrator.run(
        session_id=session_id,
        prompt=request.prompt,
        grade_level=request.grade_level,
        subject=request.subject,
    )

    return GenerateResponse(run_id=run_id, session_id=session_id)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions():
    """List all sessions."""
    sessions = session_store.list_sessions()
    return [SessionResponse(**s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """Get a specific session."""
    session = session_store.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(**session)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if not session_store.delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted"}


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@router.get("/proxy/model")
async def proxy_model(url: str = Query(..., description="URL of the 3D model to proxy")):
    """Proxy endpoint to serve 3D model files with proper CORS headers.

    Meshy's CDN does not return Access-Control-Allow-Origin headers,
    so model-viewer cannot fetch GLB files directly from the browser.
    This endpoint fetches the file server-side and streams it back.
    """
    # Only allow proxying from known safe domains
    allowed_domains = ["assets.meshy.ai", "raw.githubusercontent.com"]
    from urllib.parse import urlparse

    parsed = urlparse(url)
    if parsed.hostname not in allowed_domains:
        raise HTTPException(status_code=400, detail="URL domain not allowed for proxying")

    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Upstream returned {response.status_code}",
                )

            # Determine content type from URL path (ignoring query params)
            content_type = response.headers.get("content-type", "application/octet-stream")
            url_path = parsed.path.lower()
            if url_path.endswith(".glb"):
                content_type = "model/gltf-binary"
            elif url_path.endswith(".gltf"):
                content_type = "model/gltf+json"

            return StreamingResponse(
                iter([response.content]),
                media_type=content_type,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=86400",
                },
            )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch model: {str(e)}")

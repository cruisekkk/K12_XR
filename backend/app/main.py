import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import router as api_router
from app.api.sse import router as sse_router

# Configure logging so agent logs appear in Railway
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(name)s - %(message)s")

app = FastAPI(
    title="K12 XR Multi-Agent Platform",
    description="Multi-agent framework for democratizing XR content creation in K-12 classrooms",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(api_router)
app.include_router(sse_router)


@app.get("/")
async def root():
    return {
        "name": "K12 XR Multi-Agent Platform",
        "version": "0.1.0",
        "status": "running",
        "mock_3d": settings.mock_3d,
        "llm_provider": settings.llm_provider,
    }

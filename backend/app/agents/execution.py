import asyncio
import logging
from typing import Optional

from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.services.meshy_client import meshy_client
from app.config import settings

logger = logging.getLogger(__name__)


# Sample models for mock mode - publicly available GLB files
MOCK_MODELS = {
    "default": {
        "image_url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/screenshot/screenshot.png",
        "model_url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    },
    "science": {
        "image_url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BrainStem/screenshot/screenshot.png",
        "model_url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BrainStem/glTF-Binary/BrainStem.glb",
    },
    "arts": {
        "image_url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Suzanne/screenshot/screenshot.png",
        "model_url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Suzanne/glTF/Suzanne.gltf",
    },
}


class ExecutionAgent(BaseAgent):
    def __init__(self):
        super().__init__("execution", "Execution Agent")
        self._event_callback = None

    async def run(self, context, event_callback=None):
        """Override to capture event_callback for progress streaming."""
        self._event_callback = event_callback
        return await super().run(context, event_callback)

    async def execute(self, context: AgentContext) -> AgentResult:
        prompt = context.refined_prompt or context.original_prompt

        if settings.mock_3d:
            return await self._mock_generate(context, prompt)
        else:
            return await self._meshy_generate(context, prompt)

    async def _mock_generate(self, context: AgentContext, prompt: str) -> AgentResult:
        """Mock 3D generation using sample GLB models."""
        # Simulate processing delay
        await asyncio.sleep(2)

        # Pick a mock model based on subject
        subject = (context.subject or "").lower()
        if "science" in subject or "biology" in subject or "chemistry" in subject:
            mock = MOCK_MODELS["science"]
        elif "art" in subject:
            mock = MOCK_MODELS["arts"]
        else:
            mock = MOCK_MODELS["default"]

        return AgentResult(
            success=True,
            agent_id=self.agent_id,
            output={
                "image_url": mock["image_url"],
                "model_url": mock["model_url"],
                "format": "glb",
                "mock": True,
            },
        )

    async def _meshy_generate(self, context: AgentContext, prompt: str) -> AgentResult:
        """Real 3D generation using Meshy API: preview → refine pipeline."""
        try:
            # --- Stage 1: Preview (0-50%) ---
            async def on_preview_progress(progress: int, status: str):
                if self._event_callback:
                    scaled = min(progress, 100) // 2  # 0-50%
                    await self._event_callback(
                        "agent:progress",
                        {
                            "agent_id": self.agent_id,
                            "progress": scaled,
                            "message": f"Generating preview... {progress}%",
                        },
                    )

            preview = await meshy_client.text_to_3d(prompt, on_progress=on_preview_progress)
            preview_model_url = preview.get("model_url")
            preview_task_id = preview.get("preview_task_id")
            thumbnail_url = preview.get("thumbnail_url")

            if not preview_model_url:
                return AgentResult(
                    success=False,
                    agent_id=self.agent_id,
                    error="Meshy returned no model URL",
                )

            # --- Stage 2: Refine (50-100%) ---
            if self._event_callback:
                await self._event_callback(
                    "agent:progress",
                    {
                        "agent_id": self.agent_id,
                        "progress": 50,
                        "message": "Preview ready, refining textures...",
                        "model_url": preview_model_url,
                    },
                )

            try:
                async def on_refine_progress(progress: int, status: str):
                    if self._event_callback:
                        scaled = 50 + min(progress, 100) // 2  # 50-100%
                        await self._event_callback(
                            "agent:progress",
                            {
                                "agent_id": self.agent_id,
                                "progress": scaled,
                                "message": f"Refining textures... {progress}%",
                            },
                        )

                refine = await meshy_client.refine_text_to_3d(
                    preview_task_id, on_progress=on_refine_progress
                )
                model_url = refine.get("model_url") or preview_model_url
                thumbnail_url = refine.get("thumbnail_url") or thumbnail_url
                logger.info("[Execution] Refine succeeded, using textured model")
            except Exception as e:
                logger.warning(f"[Execution] Refine failed, falling back to preview: {e}")
                model_url = preview_model_url

            return AgentResult(
                success=True,
                agent_id=self.agent_id,
                output={
                    "image_url": thumbnail_url,
                    "model_url": model_url,
                    "format": "glb",
                    "mock": False,
                },
            )

        except Exception as e:
            return AgentResult(
                success=False,
                agent_id=self.agent_id,
                error=f"3D generation failed: {str(e)}",
            )

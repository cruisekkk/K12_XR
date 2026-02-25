import asyncio
from typing import Optional

from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.services.meshy_client import meshy_client
from app.config import settings


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
        """Real 3D generation using Meshy API: text → 3D model directly."""
        try:
            result = await meshy_client.text_to_3d(prompt)

            model_url = result.get("model_url")
            thumbnail_url = result.get("thumbnail_url")

            if not model_url:
                return AgentResult(
                    success=False,
                    agent_id=self.agent_id,
                    error="Meshy returned no model URL",
                )

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

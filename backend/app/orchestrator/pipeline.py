import asyncio
import uuid
from typing import Optional
from urllib.parse import quote

from app.agents.base import AgentContext, AgentResult
from app.agents.pedagogical import PedagogicalAgent
from app.agents.execution import ExecutionAgent
from app.agents.safeguard import SafeguardAgent
from app.agents.tutor import TutorAgent
from app.orchestrator.events import event_bus
from app.config import settings
from app.store.memory import session_store


def _proxy_url(original_url: Optional[str]) -> Optional[str]:
    """Convert a direct asset URL to a proxied URL to avoid CORS issues.

    Meshy's CDN (assets.meshy.ai) does not set Access-Control-Allow-Origin,
    so model-viewer in the browser cannot fetch GLB files directly.
    This wraps the URL through our /api/proxy/model endpoint.
    """
    if not original_url:
        return None
    return f"/api/proxy/model?url={quote(original_url, safe='')}"


class PipelineOrchestrator:
    """Orchestrates the 4-agent pipeline for XR content creation."""

    def __init__(self):
        self.pedagogical = PedagogicalAgent()
        self.execution = ExecutionAgent()
        self.safeguard = SafeguardAgent()
        self.tutor = TutorAgent()

    async def run(
        self,
        session_id: str,
        prompt: str,
        grade_level: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> str:
        """Start the pipeline. Returns run_id for SSE subscription."""
        run_id = str(uuid.uuid4())

        # Store initial session
        session_store.create_session(
            session_id=session_id,
            prompt=prompt,
            run_id=run_id,
            grade_level=grade_level,
            subject=subject,
        )

        # Run pipeline in background
        asyncio.create_task(self._execute_pipeline(run_id, session_id, prompt, grade_level, subject))

        return run_id

    async def _execute_pipeline(
        self,
        run_id: str,
        session_id: str,
        prompt: str,
        grade_level: Optional[str],
        subject: Optional[str],
    ):
        """Execute the full agent pipeline sequentially."""
        context = AgentContext(
            session_id=session_id,
            original_prompt=prompt,
            grade_level=grade_level,
            subject=subject,
        )

        async def emit(event: str, data: dict):
            await event_bus.emit(run_id, event, data)

        try:
            await emit("pipeline:start", {"session_id": session_id, "prompt": prompt})

            # 1. Pedagogical Agent: refine the prompt
            result = await self.pedagogical.run(context, emit)
            if not result.success:
                await self._fail_pipeline(run_id, "pedagogical", result.error)
                return
            context.refined_prompt = result.output.get("refined_prompt", prompt)
            session_store.update_session(session_id, refined_prompt=context.refined_prompt)

            # 2. Execution Agent: generate 3D content
            # Safeguard retry loop
            for attempt in range(settings.max_safety_retries + 1):
                context.retry_count = attempt

                result = await self.execution.run(context, emit)
                if not result.success:
                    await self._fail_pipeline(run_id, "execution", result.error)
                    return
                context.image_url = result.output.get("image_url")
                context.model_url = result.output.get("model_url")

                # Send proxied model URL to frontend immediately so
                # model-viewer can start loading while other agents run
                proxied = _proxy_url(context.model_url)
                if proxied:
                    await emit(
                        "agent:progress",
                        {
                            "agent_id": "execution",
                            "message": "3D model ready",
                            "progress": 100,
                            "model_url": proxied,
                        },
                    )

                # 3. Safeguard Agent: validate safety
                result = await self.safeguard.run(context, emit)
                if not result.success:
                    await self._fail_pipeline(run_id, "safeguard", result.error)
                    return

                if result.output.get("approved", False):
                    context.safety_approved = True
                    break
                else:
                    context.safety_feedback = result.output.get("feedback", "Content not appropriate for K-12")
                    if attempt < settings.max_safety_retries:
                        await emit(
                            "agent:progress",
                            {
                                "agent_id": "safeguard",
                                "message": f"Content flagged. Retrying ({attempt + 1}/{settings.max_safety_retries})...",
                                "progress": 50,
                            },
                        )
                    else:
                        await self._fail_pipeline(
                            run_id,
                            "safeguard",
                            f"Content failed safety check after {settings.max_safety_retries} retries",
                        )
                        return

            # Proxy URLs for CORS-safe browser access
            proxied_model_url = _proxy_url(context.model_url)
            proxied_image_url = _proxy_url(context.image_url)

            session_store.update_session(
                session_id,
                image_url=proxied_image_url,
                model_url=proxied_model_url,
            )

            # 4. Tutor Agent: add educational content
            result = await self.tutor.run(context, emit)
            if not result.success:
                await self._fail_pipeline(run_id, "tutor", result.error)
                return
            context.annotations = result.output.get("annotations", [])
            context.educational_content = result.output.get("educational_content")

            session_store.update_session(
                session_id,
                annotations=context.annotations,
                educational_content=context.educational_content,
                status="completed",
            )

            # Pipeline complete — send proxied URLs to frontend
            await emit(
                "pipeline:complete",
                {
                    "session_id": session_id,
                    "model_url": proxied_model_url,
                    "image_url": proxied_image_url,
                    "refined_prompt": context.refined_prompt,
                    "annotations": context.annotations,
                    "educational_content": context.educational_content,
                },
            )

        except Exception as e:
            await self._fail_pipeline(run_id, "pipeline", str(e))
        finally:
            await event_bus.close(run_id)

    async def _fail_pipeline(self, run_id: str, agent_id: str, error: str):
        await event_bus.emit(
            run_id,
            "pipeline:error",
            {"failed_agent": agent_id, "error": error or "Unknown error"},
        )


# Singleton
pipeline_orchestrator = PipelineOrchestrator()

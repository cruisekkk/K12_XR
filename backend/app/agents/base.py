from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional
import logging
import time

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    IDLE = "idle"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class AgentContext:
    """Shared context passed through the agent pipeline."""

    session_id: str
    original_prompt: str
    grade_level: Optional[str] = None
    subject: Optional[str] = None

    # Accumulated by agents as they run
    refined_prompt: Optional[str] = None
    image_url: Optional[str] = None
    model_url: Optional[str] = None
    safety_approved: bool = False
    safety_feedback: Optional[str] = None
    annotations: list[dict] = field(default_factory=list)
    educational_content: Optional[dict] = None

    # Metadata
    retry_count: int = 0


@dataclass
class AgentResult:
    """Result returned by an agent after execution."""

    success: bool
    agent_id: str
    output: dict = field(default_factory=dict)
    error: Optional[str] = None
    duration_ms: float = 0


class BaseAgent(ABC):
    """Abstract base class for all pipeline agents."""

    def __init__(self, agent_id: str, display_name: str):
        self.agent_id = agent_id
        self.display_name = display_name
        self.status = AgentStatus.IDLE

    @abstractmethod
    async def execute(self, context: AgentContext) -> AgentResult:
        """Execute the agent's task. Must be implemented by subclasses."""
        ...

    async def run(self, context: AgentContext, event_callback=None) -> AgentResult:
        """Run the agent with status tracking and event emission."""
        self.status = AgentStatus.RUNNING
        start_time = time.time()

        if event_callback:
            await event_callback(
                "agent:start",
                {
                    "agent_id": self.agent_id,
                    "display_name": self.display_name,
                    "message": f"{self.display_name} is starting...",
                },
            )

        try:
            result = await self.execute(context)
            elapsed = (time.time() - start_time) * 1000
            result.duration_ms = elapsed

            if result.success:
                self.status = AgentStatus.COMPLETED
                logger.info(f"[{self.agent_id}] Completed in {elapsed:.0f}ms")
                if event_callback:
                    await event_callback(
                        "agent:complete",
                        {
                            "agent_id": self.agent_id,
                            "message": f"{self.display_name} completed",
                            "result": result.output,
                            "duration_ms": elapsed,
                        },
                    )
            else:
                self.status = AgentStatus.ERROR
                logger.error(f"[{self.agent_id}] Failed: {result.error}")
                if event_callback:
                    await event_callback(
                        "agent:error",
                        {
                            "agent_id": self.agent_id,
                            "error": result.error or "Unknown error",
                            "duration_ms": elapsed,
                        },
                    )

            return result

        except Exception as e:
            elapsed = (time.time() - start_time) * 1000
            self.status = AgentStatus.ERROR
            logger.exception(f"[{self.agent_id}] Exception: {e}")
            if event_callback:
                await event_callback(
                    "agent:error",
                    {
                        "agent_id": self.agent_id,
                        "error": str(e),
                        "duration_ms": elapsed,
                    },
                )
            return AgentResult(
                success=False,
                agent_id=self.agent_id,
                error=str(e),
                duration_ms=elapsed,
            )

    async def emit_progress(self, event_callback, progress: int, message: str):
        """Helper to emit progress events during execution."""
        if event_callback:
            await event_callback(
                "agent:progress",
                {
                    "agent_id": self.agent_id,
                    "progress": progress,
                    "message": message,
                },
            )

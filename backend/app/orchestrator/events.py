import asyncio
import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SSEEvent:
    event: str
    data: dict
    id: str = ""


class EventBus:
    """In-memory event bus for streaming pipeline events via SSE."""

    def __init__(self):
        # Map of run_id -> list of subscriber queues
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    def subscribe(self, run_id: str) -> asyncio.Queue:
        """Subscribe to events for a pipeline run. Returns a queue to read from."""
        if run_id not in self._subscribers:
            self._subscribers[run_id] = []
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers[run_id].append(queue)
        return queue

    def unsubscribe(self, run_id: str, queue: asyncio.Queue):
        """Remove a subscriber."""
        if run_id in self._subscribers:
            self._subscribers[run_id] = [
                q for q in self._subscribers[run_id] if q is not queue
            ]
            if not self._subscribers[run_id]:
                del self._subscribers[run_id]

    async def emit(self, run_id: str, event: str, data: dict):
        """Emit an event to all subscribers of a pipeline run."""
        if run_id not in self._subscribers:
            return
        sse_event = SSEEvent(event=event, data=data)
        for queue in self._subscribers[run_id]:
            await queue.put(sse_event)

    async def close(self, run_id: str):
        """Signal end of stream to all subscribers."""
        if run_id not in self._subscribers:
            return
        for queue in self._subscribers[run_id]:
            await queue.put(None)  # Sentinel for stream end

    def format_sse(self, sse_event: SSEEvent) -> str:
        """Format an SSE event as a string for HTTP streaming."""
        lines = []
        if sse_event.event:
            lines.append(f"event: {sse_event.event}")
        lines.append(f"data: {json.dumps(sse_event.data)}")
        if sse_event.id:
            lines.append(f"id: {sse_event.id}")
        lines.append("")
        lines.append("")
        return "\n".join(lines)


# Singleton
event_bus = EventBus()

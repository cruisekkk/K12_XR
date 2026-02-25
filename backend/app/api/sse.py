import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.orchestrator.events import event_bus

router = APIRouter()


@router.get("/api/pipeline/{run_id}/stream")
async def pipeline_stream(run_id: str):
    """SSE endpoint for streaming pipeline events."""

    async def event_generator():
        queue = event_bus.subscribe(run_id)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                except asyncio.TimeoutError:
                    # Send keepalive comment
                    yield ": keepalive\n\n"
                    continue

                if event is None:
                    # Stream ended
                    yield event_bus.format_sse(
                        type("SSEEvent", (), {"event": "stream:end", "data": {}, "id": ""})()
                    )
                    break

                yield event_bus.format_sse(event)

        except asyncio.CancelledError:
            pass
        finally:
            event_bus.unsubscribe(run_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

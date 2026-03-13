# API Reference

Base URL: `http://localhost:8000` (development) or your Railway deployment URL.

## REST Endpoints

### Health Check

```
GET /api/health
```

**Response:**
```json
{ "status": "ok" }
```

---

### Generate XR Content

Triggers the multi-agent pipeline. Returns immediately with a `run_id` for SSE subscription.

```
POST /api/generate
```

**Request Body:**
```json
{
    "prompt": "3D model of a human heart for middle school biology class",
    "session_id": "optional-custom-id",
    "grade_level": "6-8",
    "subject": "Biology"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Teacher's natural language request |
| `session_id` | string | No | Custom session ID (auto-generated if omitted) |
| `grade_level` | string | No | Target grade level (e.g., "K-2", "3-5", "6-8", "9-12") |
| `subject` | string | No | Subject area (e.g., "Science", "Biology", "History", "Arts") |

**Response (200):**
```json
{
    "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "session_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef"
}
```

Use `run_id` to subscribe to the SSE stream for real-time pipeline progress.

---

### List Sessions

```
GET /api/sessions
```

**Response (200):**
```json
[
    {
        "id": "f0e1d2c3-...",
        "prompt": "3D model of a human heart...",
        "run_id": "a1b2c3d4-...",
        "status": "completed",
        "grade_level": "6-8",
        "subject": "Biology",
        "refined_prompt": "Generate a scientifically accurate...",
        "image_url": "https://...",
        "model_url": "https://...DamagedHelmet.glb",
        "annotations": [...],
        "educational_content": {...},
        "created_at": "2026-02-24T20:00:00Z",
        "updated_at": "2026-02-24T20:01:30Z"
    }
]
```

Sessions are sorted by `created_at` descending (newest first).

---

### Get Session

```
GET /api/sessions/{session_id}
```

**Response (200):** Same shape as a single item in the list response above.

**Response (404):**
```json
{ "detail": "Session not found" }
```

---

### Delete Session

```
DELETE /api/sessions/{session_id}
```

**Response (200):**
```json
{ "status": "deleted" }
```

**Response (404):**
```json
{ "detail": "Session not found" }
```

---

### Proxy 3D Model

Proxies a 3D model file from an external URL (e.g., Meshy's CDN) to avoid CORS issues. The response includes proper `Access-Control-Allow-Origin` headers.

```
GET /api/proxy/model?url={encoded_url}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string (URL-encoded) | Yes | The original model file URL to proxy |

**Response:** Streams the binary model file with `Content-Type: model/gltf-binary` (or appropriate type).

**Why:** Meshy's CDN (`assets.meshy.ai`) does not return CORS headers, so `<model-viewer>` in the browser cannot fetch GLB files directly. This endpoint fetches the file server-side and serves it with CORS headers.

---

## Server-Sent Events (SSE) Stream

### Subscribe to Pipeline Events

```
GET /api/pipeline/{run_id}/stream
```

Returns a `text/event-stream` response. The stream emits events as the agent pipeline progresses.

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Keepalive:** A comment (`: keepalive`) is sent every 30 seconds to prevent connection timeout.

---

### SSE Event Types

#### `pipeline:start`

Emitted when the pipeline begins execution.

```
event: pipeline:start
data: {"session_id": "f0e1d2c3-...", "prompt": "3D model of a human heart..."}
```

---

#### `agent:start`

Emitted when an agent begins executing.

```
event: agent:start
data: {"agent_id": "pedagogical", "display_name": "Pedagogical Agent", "message": "Pedagogical Agent is starting..."}
```

---

#### `agent:progress`

Emitted during agent execution to report intermediate progress.

```
event: agent:progress
data: {"agent_id": "execution", "progress": 50, "message": "Preview ready, refining textures...", "model_url": "/api/proxy/model?url=..."}
```

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | string | One of: `pedagogical`, `execution`, `safeguard`, `tutor` |
| `progress` | number | 0-100 percentage |
| `message` | string | Human-readable status message |
| `model_url` | string | *(Execution agent only, optional)* Proxied URL of the preview model, sent at ~50% so the viewer can display it while refine runs |

---

#### `agent:complete`

Emitted when an agent finishes successfully.

```
event: agent:complete
data: {
    "agent_id": "pedagogical",
    "message": "Pedagogical Agent completed",
    "result": {
        "refined_prompt": "Generate a scientifically accurate...",
        "learning_objectives": ["..."],
        "key_features": ["..."]
    },
    "duration_ms": 2345.6
}
```

---

#### `agent:error`

Emitted when an agent fails.

```
event: agent:error
data: {"agent_id": "execution", "error": "3D generation failed: API timeout", "duration_ms": 30000}
```

---

#### `pipeline:complete`

Emitted when all agents finish successfully. Contains the final aggregated result.

```
event: pipeline:complete
data: {
    "session_id": "f0e1d2c3-...",
    "model_url": "https://...DamagedHelmet.glb",
    "image_url": "https://...",
    "refined_prompt": "Generate a scientifically accurate...",
    "annotations": [
        {"id": "ann_1", "label": "Left Ventricle", "description": "...", "position_hint": "left"}
    ],
    "educational_content": {
        "title": "The Human Heart",
        "overview": "...",
        "key_facts": ["..."],
        "vocabulary": [{"term": "...", "definition": "..."}],
        "quiz_questions": [{"question": "...", "options": [...], "correct_answer": 0, "explanation": "..."}],
        "fun_facts": ["..."],
        "further_reading": ["..."]
    }
}
```

---

#### `pipeline:error`

Emitted when the pipeline fails irrecoverably.

```
event: pipeline:error
data: {"failed_agent": "safeguard", "error": "Content failed safety check after 3 retries"}
```

---

#### `stream:end`

Emitted as the final event before the stream closes.

```
event: stream:end
data: {}
```

---

## Frontend SSE Proxy

The Next.js frontend includes an SSE proxy at:

```
GET /api/agents/stream?runId={run_id}
```

This proxies requests to the backend's `/api/pipeline/{run_id}/stream` endpoint, keeping the backend URL hidden from the browser. The frontend `useAgentStream` hook connects to this proxy.

---

## Error Handling

All error responses follow this shape:

```json
{
    "detail": "Human-readable error message"
}
```

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad request (missing or invalid parameters) |
| 404 | Resource not found (session doesn't exist) |
| 500 | Internal server error |
| 502 | Backend SSE stream unavailable (proxy error) |

---

## Example: Full Generation Flow

```bash
# 1. Start generation
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "3D model of human heart for biology", "grade_level": "6-8", "subject": "Biology"}'

# Response: {"run_id": "abc123", "session_id": "def456"}

# 2. Subscribe to SSE stream
curl -N http://localhost:8000/api/pipeline/abc123/stream

# Events stream in:
# event: pipeline:start
# data: {"session_id": "def456", "prompt": "3D model of human heart for biology"}
#
# event: agent:start
# data: {"agent_id": "pedagogical", ...}
#
# event: agent:complete
# data: {"agent_id": "pedagogical", "result": {"refined_prompt": "..."}, ...}
#
# ... (execution, safeguard, tutor agents)
#
# event: pipeline:complete
# data: {"session_id": "def456", "model_url": "https://...", ...}

# 3. Fetch completed session
curl http://localhost:8000/api/sessions/def456
```

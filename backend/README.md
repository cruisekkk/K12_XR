# K12 XR — Backend

Python FastAPI server that orchestrates the multi-agent pipeline for XR educational content generation.

## Tech Stack

- **Framework:** FastAPI (async)
- **Language:** Python 3.12+
- **LLM:** Anthropic Claude SDK + OpenAI SDK (switchable)
- **3D Generation:** Meshy API (with mock mode)
- **Web Search:** Tavily API
- **Real-time:** Server-Sent Events (SSE)
- **Storage:** In-memory (dict-based)

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
# Edit .env with your API keys (at minimum: ANTHROPIC_API_KEY or OPENAI_API_KEY)

# Run
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

Edit `.env`:

```env
LLM_PROVIDER=claude              # claude | openai
ANTHROPIC_API_KEY=sk-ant-...     # Required if LLM_PROVIDER=claude
OPENAI_API_KEY=sk-...            # Required if LLM_PROVIDER=openai
MOCK_3D=true                     # true = sample GLBs, false = real Meshy API
MESHY_API_KEY=...                # Required if MOCK_3D=false
TAVILY_API_KEY=tvly-...          # Optional: enables Tutor agent web search
ALLOWED_ORIGINS=http://localhost:3000   # CORS origins (comma-separated)
ENV=development
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/generate` | Start multi-agent pipeline |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/{id}` | Get session details |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `GET` | `/api/pipeline/{run_id}/stream` | SSE stream of pipeline events |

See [docs/API.md](../docs/API.md) for the full API reference.

## Module Structure

```
app/
├── main.py                 # FastAPI app, CORS, route mounting
├── config.py               # Pydantic Settings (env vars)
│
├── agents/                 # AI Agent implementations
│   ├── base.py             # BaseAgent, AgentContext, AgentResult
│   ├── pedagogical.py      # Prompt refinement (LLM)
│   ├── execution.py        # 3D generation (Meshy/mock)
│   ├── safeguard.py        # K-12 safety validation (LLM)
│   └── tutor.py            # Educational content (LLM + web search)
│
├── orchestrator/           # Pipeline control
│   ├── pipeline.py         # Sequential agent execution with retry loop
│   └── events.py           # EventBus: asyncio Queue-based SSE fan-out
│
├── services/               # External API clients
│   ├── llm.py              # Unified LLM client (Claude + OpenAI)
│   ├── meshy_client.py     # Meshy 3D API (text→image→3D + polling)
│   └── web_search.py       # Tavily search API
│
├── api/                    # HTTP layer
│   ├── routes.py           # REST endpoints
│   └── sse.py              # SSE streaming endpoint
│
├── models/
│   └── schemas.py          # Pydantic request/response models
│
└── store/
    └── memory.py           # In-memory session store (dict-based)
```

## Agent Pipeline

```
POST /api/generate { prompt }
          │
          ▼
  PipelineOrchestrator.run()
          │
          ├─ Creates session + run_id
          ├─ Spawns async pipeline task
          └─ Returns run_id for SSE subscription
                    │
                    ▼
         _execute_pipeline()
                    │
     1. Pedagogical Agent  ─── Refine prompt via LLM
                    │
     2. Execution Agent    ─── Generate 3D model (mock or Meshy)
                    │
     3. Safeguard Agent    ─── Validate K-12 safety via LLM
          │                     │
          │ Rejected?           │ Approved?
          │ Retry (max 3) ◄────┘
          │                     │
     4. Tutor Agent        ─── Generate educational content (LLM + web search)
                    │
         pipeline:complete ─── Emit final event, close SSE stream
```

## Key Design Patterns

### Agent Base Class

All agents subclass `BaseAgent` and implement `async execute(context) -> AgentResult`. The `run()` wrapper handles status tracking and SSE event emission.

### Event Bus

`EventBus` in `orchestrator/events.py` uses `asyncio.Queue` for fan-out to multiple SSE subscribers. Each subscriber gets its own queue. Events are serialized to SSE text format.

### LLM Client

`LLMClient` in `services/llm.py` abstracts Claude and OpenAI behind a unified interface. Methods: `chat()`, `chat_with_vision()`, `chat_json()`. Provider is selected via `LLM_PROVIDER` env var.

### Mock Mode

When `MOCK_3D=true`, the Execution Agent skips Meshy API calls and returns pre-defined GLB model URLs from KhronosGroup's glTF sample repository with a 2-second simulated delay.

## Deployment

Deploy to Railway:

1. Create a new project in Railway
2. Link to the `backend/` directory
3. Railway auto-detects the `Dockerfile`
4. Set environment variables in Railway dashboard
5. Deploy — `railway.toml` configures the start command and health check

### Dockerfile

The included Dockerfile uses `python:3.12-slim`, installs dependencies, and runs uvicorn on port 8000.

### Railway Config

`railway.toml` sets:
- Builder: Dockerfile
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `GET /api/health`
- Restart policy: on failure (max 3 retries)

# CLAUDE.md — K12 XR Multi-Agent Platform

This file provides guidance for Claude Code when working on this project.

## Project Overview

K12 XR is a multi-agent framework that democratizes XR (Extended Reality) content creation for K-12 classrooms. Teachers enter natural language prompts and a pipeline of 4 AI agents collaboratively generates safe, curriculum-aligned, interactive 3D educational content viewable on commodity devices (Chromebooks).

## Repository Structure

```
K12_XR/
├── backend/          # Python FastAPI server (deploys to Railway)
│   ├── app/
│   │   ├── agents/           # 4 specialized AI agents
│   │   ├── orchestrator/     # Pipeline controller + SSE event bus
│   │   ├── services/         # External API clients (LLM, Meshy, Tavily)
│   │   ├── api/              # REST + SSE endpoints
│   │   ├── models/           # Pydantic request/response schemas
│   │   ├── store/            # In-memory session storage
│   │   ├── config.py         # Pydantic Settings (env vars)
│   │   └── main.py           # FastAPI app entry point
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/         # Next.js 16 app (deploys to Vercel)
│   ├── src/
│   │   ├── app/              # App Router pages and API routes
│   │   ├── components/       # React components (agents, viewer, prompt, layout)
│   │   ├── stores/           # Zustand state stores
│   │   ├── hooks/            # Custom hooks (SSE stream)
│   │   ├── lib/              # API client, utilities
│   │   └── types/            # TypeScript type definitions
│   └── vercel.json
│
└── docs/             # Architecture, API reference, roadmap
```

## Key Concepts

### The 4-Agent Pipeline

The core of the system is a sequential agent pipeline defined in `backend/app/orchestrator/pipeline.py`:

1. **Pedagogical Agent** (`agents/pedagogical.py`) — Refines a teacher's simple prompt into a detailed, curriculum-aligned prompt with learning objectives, key features, and grade-appropriate complexity. Uses LLM.
2. **Execution Agent** (`agents/execution.py`) — Generates a 3D model. In mock mode (`MOCK_3D=true`) returns sample GLB files; in production calls Meshy API two-stage pipeline (text-to-3d preview → refine with PBR textures, ~3-5 min). Preview model shown at 50% while refine runs; falls back to preview if refine fails. All Meshy URLs proxied through `/api/proxy/model` to avoid CORS.
3. **Safeguard Agent** (`agents/safeguard.py`) — Validates generated content against K-12 safety protocols (age-appropriateness, accuracy, bias, safety). If content fails, the pipeline retries Execution+Safeguard up to `max_safety_retries` times.
4. **Tutor Agent** (`agents/tutor.py`) — Enriches the scene with educational annotations, vocabulary, quiz questions, key facts, and fun facts. Uses LLM + web search (Tavily).

### Agent Base Class

All agents extend `BaseAgent` in `agents/base.py`. The `run()` method wraps `execute()` with status tracking and SSE event emission. When adding a new agent, subclass `BaseAgent` and implement `execute(context: AgentContext) -> AgentResult`.

### Real-Time Communication

The backend streams pipeline progress to the frontend via **Server-Sent Events (SSE)**:
- Backend emits events through `orchestrator/events.py` (asyncio Queue-based EventBus)
- SSE endpoint: `GET /api/pipeline/{run_id}/stream` in `api/sse.py`
- Frontend subscribes via `useAgentStream` hook → updates Zustand stores → React re-renders
- Event types: `agent:start`, `agent:progress`, `agent:complete`, `agent:error`, `pipeline:complete`, `pipeline:error`

### LLM Abstraction

`services/llm.py` provides a unified `LLMClient` that supports both Claude (Anthropic) and OpenAI, switchable via `LLM_PROVIDER` env var. Methods: `chat()`, `chat_with_vision()`, `chat_json()`. The default model is `claude-sonnet-4-20250514` for Claude or `gpt-4o` for OpenAI.

### 3D Viewer

The frontend uses Google's `<model-viewer>` web component loaded via CDN script tag (not npm — direct import causes Next.js SSR build failures). See `components/viewer/ModelViewer.tsx`. The viewer supports WebXR/AR on compatible devices and falls back to interactive 3D-in-browser.

### State Management

Two Zustand stores on the frontend:
- `useAgentStore` — Agent statuses, pipeline state, logs (updated by SSE events)
- `useSessionStore` — Current session data: prompt, model URL, annotations, educational content

### Storage

Currently **in-memory only** (`store/memory.py`). Sessions are lost on backend restart. This is intentional for the demo phase.

## Build & Run Commands

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps    # Required due to next-auth peer dep conflicts
npm run dev                       # Dev server on port 3000
npm run build                     # Production build (verify before deploy)
```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | No | `claude` | `claude` or `openai` |
| `ANTHROPIC_API_KEY` | If claude | — | Anthropic API key |
| `OPENAI_API_KEY` | If openai | — | OpenAI API key |
| `MOCK_3D` | No | `true` | Use sample GLB models instead of Meshy |
| `MESHY_API_KEY` | If `MOCK_3D=false` | — | Meshy 3D generation API key |
| `TAVILY_API_KEY` | No | — | Tavily web search (Tutor agent) |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | CORS origins (comma-separated) |

### Frontend (`frontend/.env.local`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend URL |
| `NEXTAUTH_SECRET` | For auth | — | NextAuth session secret |
| `GOOGLE_CLIENT_ID` | For auth | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For auth | — | Google OAuth client secret |

## Conventions

- **Backend**: Python 3.12+, FastAPI, async/await throughout, Pydantic for validation
- **Frontend**: TypeScript strict mode, Next.js App Router, Tailwind CSS, Zustand stores
- **Agents**: All agents return `AgentResult` with `success`, `agent_id`, `output` dict, and optional `error`
- **SSE events**: Always include `agent_id` for routing; data is JSON-serialized
- **npm install**: Always use `--legacy-peer-deps` flag
- **model-viewer**: Loaded via CDN `<Script>` tag, never via npm import
- **Deployment**: Frontend → Vercel, Backend → Railway

## Common Pitfalls

- `@google/model-viewer` npm package breaks Next.js SSR builds — use CDN script instead
- `next-auth` v5 beta uses `NextAuth().handlers` pattern, not the v4 `NextAuth()` export-as-handler pattern
- Meshy API calls are async: preview ~70s + refine ~135s (total ~3-5 min). Polling logic in `services/meshy_client.py`. The 99% progress stage can stall for 30-40s before transitioning to SUCCEEDED — this is normal Meshy behavior.
- Meshy's CDN (`assets.meshy.ai`) does not set CORS headers — all model URLs must be proxied through `/api/proxy/model`
- The SSE endpoint sends a `None` sentinel to signal stream end; frontend must handle this gracefully
- Railway free plan requires `sleepApplication = true` in `railway.toml` for serverless mode

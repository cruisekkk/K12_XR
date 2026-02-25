# Architecture

## System Overview

K12 XR is a monorepo with two deployable services:

- **Frontend** — Next.js 16 (App Router) deployed to Vercel
- **Backend** — Python FastAPI deployed to Railway

Communication between them is HTTP-based: REST for commands, SSE (Server-Sent Events) for real-time streaming.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          User's Browser                              │
│                                                                      │
│  ┌─────────────┐  ┌───────────────┐  ┌───────────┐  ┌────────────┐ │
│  │ PromptInput │  │ AgentPipeline │  │ModelViewer│  │EducPanel   │ │
│  └──────┬──────┘  └───────┬───────┘  └─────┬─────┘  └─────┬──────┘ │
│         │                 │                │              │         │
│         │     ┌───────────┴────────────────┴──────────────┘         │
│         │     │        Zustand Stores                               │
│         │     │   useAgentStore  ·  useSessionStore                 │
│         │     └───────────┬───────────────────────────┐             │
│         │                 │                           │             │
│  ┌──────┴─────┐   ┌──────┴──────┐             ┌──────┴──────┐      │
│  │ API Client │   │useAgentStream│             │  Next.js    │      │
│  │ (REST)     │   │  (SSE Hook) │             │  API Routes │      │
│  └──────┬─────┘   └──────┬──────┘             └──────┬──────┘      │
│         │                │                           │             │
└─────────┼────────────────┼───────────────────────────┼─────────────┘
          │                │                           │
          │    POST /api/generate     GET /api/pipeline/{run_id}/stream
          │                │                           │
┌─────────┼────────────────┼───────────────────────────┼─────────────┐
│         ▼                ▼            Backend (FastAPI)             │
│  ┌─────────────┐  ┌──────────────┐                                 │
│  │  REST API   │  │  SSE Stream  │                                 │
│  │  routes.py  │  │  sse.py      │                                 │
│  └──────┬──────┘  └──────┬───────┘                                 │
│         │                ▲                                          │
│         ▼                │ events                                   │
│  ┌──────────────────────────────────────┐                          │
│  │       Pipeline Orchestrator          │                          │
│  │       orchestrator/pipeline.py       │                          │
│  │                                      │                          │
│  │  AgentContext flows through:         │                          │
│  │                                      │                          │
│  │  ┌────────────┐  ┌──────────────┐   │                          │
│  │  │Pedagogical │──▶│  Execution   │   │                          │
│  │  │   Agent    │  │    Agent     │   │                          │
│  │  └────────────┘  └──────┬───────┘   │                          │
│  │                         │           │                          │
│  │                         ▼           │                          │
│  │                  ┌──────────────┐   │                          │
│  │                  │  Safeguard   │◄──┤  retry loop              │
│  │                  │    Agent     │───┤  (max 3)                 │
│  │                  └──────┬───────┘   │                          │
│  │                         │ approved  │                          │
│  │                         ▼           │                          │
│  │                  ┌──────────────┐   │                          │
│  │                  │    Tutor     │   │                          │
│  │                  │    Agent     │   │                          │
│  │                  └──────────────┘   │                          │
│  └──────────────────────────────────────┘                          │
│                                                                    │
│  External Services:                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                           │
│  │ Claude/ │  │  Meshy  │  │ Tavily  │                           │
│  │ OpenAI  │  │   API   │  │  Search │                           │
│  └─────────┘  └─────────┘  └─────────┘                           │
└────────────────────────────────────────────────────────────────────┘
```

## Design Decisions

### Why SSE over WebSockets?

The agent pipeline produces **unidirectional** status updates (server → client). The only client-to-server communication is the initial POST to trigger generation. SSE is simpler, auto-reconnects, works natively with Vercel's edge runtime, and requires no protocol upgrade handshake.

### Why model-viewer via CDN instead of npm?

`@google/model-viewer` imports Three.js internally. When bundled by Next.js, this causes SSR build failures because Three.js accesses browser-only globals (`window`, `document`). Loading via `<Script>` CDN tag ensures the web component only initializes client-side. See `components/viewer/ModelViewer.tsx`.

### Why Zustand over Context/Redux?

Agent status updates arrive multiple times per second via SSE. React Context would cause full subtree re-renders on every update. Zustand's selector-based subscriptions let each component subscribe to only the slice it needs (e.g., `useAgentStore(s => s.agents.execution.status)`), minimizing re-renders.

### Why FastAPI (Python) instead of Node.js?

- Python has the stronger AI/ML ecosystem (Anthropic SDK, OpenAI SDK)
- FastAPI's native async support handles concurrent long-running agent tasks well
- The Meshy API polling pattern is natural with Python's `asyncio`
- Clear separation: TypeScript for UI, Python for AI orchestration

### Why in-memory storage?

For the demo/prototype phase, in-memory storage eliminates database setup complexity. The `SessionStore` class in `store/memory.py` has a simple dict-based interface that can be swapped for PostgreSQL/Redis later without changing the API layer.

### Why mock 3D mode?

Meshy API calls cost money and take 1-5 minutes per generation. Mock mode (`MOCK_3D=true`) returns sample GLB files instantly, enabling full pipeline testing (all 4 agents run, SSE events stream, frontend renders) without API costs or wait times.

## Data Flow

### Generation Request Lifecycle

```
1. Teacher submits prompt in PromptInput component
2. Frontend POSTs to backend: POST /api/generate { prompt, grade_level, subject }
3. Backend creates session, generates run_id, returns { run_id, session_id }
4. Backend spawns async pipeline task (asyncio.create_task)
5. Frontend opens SSE connection: GET /api/pipeline/{run_id}/stream
6. Pipeline runs agents sequentially, emitting events to EventBus
7. EventBus fans out events to all SSE subscribers via asyncio.Queue
8. Frontend useAgentStream hook parses events, updates Zustand stores
9. React components re-render: AgentPipeline shows progress, ModelViewer loads GLB
10. Pipeline emits pipeline:complete with final data (model_url, annotations, etc.)
11. SSE stream closes
```

### Agent Context Accumulation

The `AgentContext` dataclass is a shared mutable context that accumulates data as it flows through agents:

```
                    AgentContext
                    ├── original_prompt     ← set at start
                    ├── grade_level         ← set at start
                    ├── subject             ← set at start
Start ──────────────┤
                    │
Pedagogical ────────├── refined_prompt      ← set by Pedagogical
                    │
Execution ──────────├── image_url           ← set by Execution
                    ├── model_url           ← set by Execution
                    │
Safeguard ──────────├── safety_approved     ← set by Safeguard
                    ├── safety_feedback     ← set by Safeguard (if rejected)
                    │
Tutor ──────────────├── annotations[]       ← set by Tutor
                    └── educational_content ← set by Tutor
```

## Frontend Page Architecture

```
/                           Landing page (public, static)
/login                      Google OAuth login
/create                     ★ Main creation workspace (dashboard layout)
/sessions                   Session history list (dashboard layout)
/view/[sessionId]           Student immersive viewer
/api/agents/stream          SSE proxy to backend
/api/auth/[...nextauth]     NextAuth endpoints
```

### Dashboard Layout (`/create`, `/sessions`)

```
┌─────────┬────────────────────────────────┬──────────┐
│         │        Header Bar              │          │
│         ├────────────────────────────────┤  Student │
│ Sidebar │                                │   View   │
│         │     3D Model Viewer            │   Grid   │
│  ✨ Create │   (model-viewer)             │          │
│  📂 Sessions │                            │  👤 👤   │
│         │                                │  👤 👤   │
│         ├────────────────────────────────┤          │
│         │  Educational Panel (tabs)      │          │
│         ├────────────────────────────────┴──────────┤
│         │  Agent Pipeline (4 status cards)          │
│         │  Agent Log                                │
│         │  Prompt Input + Grade/Subject selectors   │
└─────────┴───────────────────────────────────────────┘
```

## Backend Module Dependency Graph

```
main.py
├── config.py (Settings singleton)
├── api/routes.py
│   ├── models/schemas.py
│   ├── orchestrator/pipeline.py
│   │   ├── agents/pedagogical.py ──┐
│   │   ├── agents/execution.py  ──┤── agents/base.py
│   │   ├── agents/safeguard.py  ──┤
│   │   ├── agents/tutor.py     ──┘
│   │   ├── orchestrator/events.py (EventBus)
│   │   └── store/memory.py
│   └── store/memory.py
├── api/sse.py
│   └── orchestrator/events.py
└── services/
    ├── llm.py (Claude + OpenAI)
    ├── meshy_client.py
    └── web_search.py (Tavily)
```

## Security Considerations

- API keys are stored in `.env` files, never committed to git
- CORS is restricted to `ALLOWED_ORIGINS`
- Safeguard Agent validates all generated content before it reaches students
- Google OAuth provides identity verification for teachers
- The frontend SSE proxy (`/api/agents/stream`) shields the backend URL from clients
- No user-supplied data is passed to shell commands or SQL queries (no injection surface)

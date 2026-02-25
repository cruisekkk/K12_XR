# K12 XR — Multi-Agent Framework for Democratizing XR Content Creation in K-12 Classrooms

A web platform that lets K-12 teachers create immersive 3D educational content from simple natural language prompts. A pipeline of four specialized AI agents handles prompt refinement, 3D generation, safety validation, and educational enrichment — so teachers can focus on teaching, not technical complexity.

> **Paper:** *A Multi-Agent Framework for Democratizing XR Content Creation in K-12 Classrooms*

## Demo

```
Teacher types:  "3D model of a human heart for middle school biology class"
                              ↓
         ┌──────────────────────────────────────────────┐
         │  Pedagogical Agent refines the prompt         │
         │  Execution Agent generates a 3D heart model   │
         │  Safeguard Agent validates K-12 safety        │
         │  Tutor Agent adds labels, quizzes, vocab      │
         └──────────────────────────────────────────────┘
                              ↓
         Interactive 3D heart with educational annotations,
         viewable in-browser or in AR on supported devices
```

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│   Frontend (Next.js 16)     │  SSE    │   Backend (Python FastAPI)   │
│   Vercel                    │◄───────►│   Railway                    │
│                             │  REST   │                              │
│  ┌──────────────────────┐   │         │  ┌────────────────────────┐  │
│  │ Landing Page          │   │         │  │ Pipeline Orchestrator  │  │
│  │ Teacher Dashboard     │   │         │  │                        │  │
│  │  ├ 3D Viewer          │   │         │  │  1. Pedagogical Agent  │  │
│  │  ├ Agent Pipeline UI  │   │         │  │  2. Execution Agent    │  │
│  │  ├ Prompt Input       │   │         │  │  3. Safeguard Agent    │  │
│  │  └ Student Grid       │   │         │  │  4. Tutor Agent        │  │
│  │ Student Viewer        │   │         │  │                        │  │
│  └──────────────────────┘   │         │  └────────────────────────┘  │
│                             │         │                              │
│  Zustand · model-viewer     │         │  LLM · Meshy · Tavily       │
└─────────────────────────────┘         └──────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed system design.

## The Four Agents

| # | Agent | Role | Technology |
|---|-------|------|------------|
| 1 | **Pedagogical** | Refines teacher prompts into curriculum-aligned, detailed prompts with learning objectives | LLM (Claude/OpenAI) |
| 2 | **Execution** | Generates 3D models (text → image → 3D model) | Meshy API (or mock mode) |
| 3 | **Safeguard** | Validates content for K-12 safety, accuracy, and bias; retries if content fails | LLM with vision |
| 4 | **Tutor** | Adds educational annotations, vocabulary, quiz questions, and key facts | LLM + Tavily web search |

See [docs/AGENTS.md](docs/AGENTS.md) for the full agent system documentation.

## Three K-12 Scenarios

1. **Science Visualization** — Anatomical models, molecular structures, solar systems
2. **Arts Exploration** — Historical sculptures, architectural wonders, artistic masterpieces
3. **Immersive Creative Writing** — Story settings and characters brought to life in 3D

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- At least one LLM API key (Anthropic or OpenAI)

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure API keys
cp .env .env.local   # Edit with your keys
# At minimum: set ANTHROPIC_API_KEY or OPENAI_API_KEY

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install --legacy-peer-deps

# Start dev server
npm run dev
```

### 3. Open the App

Navigate to http://localhost:3000 and click **Create XR Content** or go directly to http://localhost:3000/create.

Enter a prompt like *"3D model of a human heart for middle school biology class"* and watch the agent pipeline work.

> **Mock mode** is on by default (`MOCK_3D=true`). The pipeline works end-to-end without a Meshy API key — it returns sample GLB models from KhronosGroup's repository.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | No | `claude` | LLM provider: `claude` or `openai` |
| `ANTHROPIC_API_KEY` | If `claude` | — | Anthropic API key |
| `OPENAI_API_KEY` | If `openai` | — | OpenAI API key |
| `MOCK_3D` | No | `true` | `true` = sample GLBs, `false` = real Meshy generation |
| `MESHY_API_KEY` | If `MOCK_3D=false` | — | Meshy 3D generation API key |
| `TAVILY_API_KEY` | No | — | Tavily web search for Tutor agent |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | CORS allowed origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend API URL |
| `NEXTAUTH_SECRET` | For auth | — | NextAuth session encryption secret |
| `GOOGLE_CLIENT_ID` | For Google login | — | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | For Google login | — | Google OAuth 2.0 client secret |

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16, TypeScript, Tailwind CSS | Modern React with SSR and App Router |
| State | Zustand | Lightweight, SSE-friendly, selector-based subscriptions |
| 3D Viewer | Google model-viewer (CDN) | WebXR/AR support, works on Chromebooks, zero config |
| Backend | Python FastAPI | Async-native, ideal for AI workloads |
| LLM | Claude (Anthropic) / GPT-4o (OpenAI) | Flexible via `LLM_PROVIDER` env var |
| 3D Generation | Meshy API | Text → Image → 3D model pipeline |
| Web Search | Tavily API | Educational research for Tutor agent |
| Auth | NextAuth v5 + Google OAuth | K-12 schools commonly use Google Workspace |
| Real-time | Server-Sent Events (SSE) | Unidirectional streaming, Vercel-compatible |

## Deployment

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | [Vercel](https://vercel.com) | `frontend/vercel.json` — set env vars in Vercel dashboard |
| Backend | [Railway](https://railway.app) | `backend/Dockerfile` + `backend/railway.toml` — set env vars in Railway dashboard |

### Deploy Steps

1. **Backend (Railway)**: Create a new project → link to `backend/` directory → Railway auto-detects Dockerfile → set environment variables → deploy
2. **Frontend (Vercel)**: Import repo → set root directory to `frontend/` → set `NEXT_PUBLIC_API_URL` to your Railway backend URL → deploy

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Project guide for Claude Code (conventions, key concepts, pitfalls) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Detailed system architecture and design decisions |
| [docs/AGENTS.md](docs/AGENTS.md) | Agent system: base class, pipeline, individual agents |
| [docs/API.md](docs/API.md) | Full REST + SSE API reference |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Development roadmap and future plans |

## Project Structure

```
K12_XR/
├── backend/                    # Python FastAPI → Railway
│   ├── app/
│   │   ├── agents/             # 4 AI agents (pedagogical, execution, safeguard, tutor)
│   │   ├── orchestrator/       # Pipeline controller + SSE event bus
│   │   ├── services/           # LLM, Meshy, Tavily API clients
│   │   ├── api/                # REST routes + SSE streaming endpoint
│   │   ├── models/             # Pydantic request/response schemas
│   │   ├── store/              # In-memory session storage
│   │   ├── config.py           # Environment configuration
│   │   └── main.py             # App entry point
│   ├── Dockerfile
│   ├── railway.toml
│   └── requirements.txt
│
├── frontend/                   # Next.js 16 → Vercel
│   ├── src/
│   │   ├── app/                # Pages: /, /create, /sessions, /view/[id], /login
│   │   ├── components/         # UI: viewer, agents, prompt, session, layout
│   │   ├── stores/             # Zustand: useAgentStore, useSessionStore
│   │   ├── hooks/              # useAgentStream (SSE)
│   │   ├── lib/                # API client, utilities
│   │   └── types/              # TypeScript interfaces
│   ├── vercel.json
│   └── .env.local
│
├── docs/                       # Documentation
├── CLAUDE.md                   # Project guide for Claude Code
└── README.md                   # This file
```

## License

Research project — contact authors for licensing details.

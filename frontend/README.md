# K12 XR — Frontend

Next.js 16 web application providing the teacher dashboard, 3D viewer, and student experience.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State:** Zustand
- **3D:** Google model-viewer (CDN)
- **Auth:** NextAuth v5 (Google OAuth)
- **Real-time:** Server-Sent Events (SSE)

## Setup

```bash
npm install --legacy-peer-deps    # --legacy-peer-deps required for next-auth
npm run dev                       # http://localhost:3000
npm run build                     # Production build
npm run lint                      # ESLint
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Only `NEXT_PUBLIC_API_URL` is needed for basic development (auth is optional for demo mode).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — product overview and "Get Started" CTA |
| `/create` | Main creation workspace — 3D viewer, agent pipeline, prompt input |
| `/sessions` | Session history — list of past generation sessions |
| `/view/[sessionId]` | Student viewer — immersive 3D view with educational content |
| `/login` | Login page — Google OAuth or demo mode bypass |

## Architecture

### Component Hierarchy (Create Page)

```
(dashboard)/layout.tsx
└── Sidebar
└── create/page.tsx
    ├── ModelViewer          — 3D model rendering (model-viewer web component)
    ├── EducationalPanel     — Tabs: overview, labels, quiz, vocabulary
    ├── StudentViewGrid      — Right panel: student session thumbnails
    ├── AgentPipeline        — Horizontal stepper with 4 agent status cards
    │   └── AgentStatusCard  — Individual agent: icon, status, progress bar
    ├── AgentLog             — Scrollable terminal-style agent log
    └── PromptInput          — Text input with grade/subject selectors
```

### State Stores

**`useAgentStore`** — Agent pipeline state (updated by SSE events)
- `agents` — Status of each of the 4 agents (idle/running/completed/error)
- `pipelineStatus` — Overall pipeline status
- `logs` — Timestamped agent log entries

**`useSessionStore`** — Current session data
- `prompt`, `gradeLevel`, `subject` — User inputs
- `sessionId`, `runId` — Identifiers (runId used for SSE subscription)
- `modelUrl`, `imageUrl` — Generated content URLs
- `annotations`, `educationalContent` — Tutor agent output
- `refinedPrompt` — Pedagogical agent output

### Data Flow

```
User types prompt → PromptInput
    → POST /api/generate → Backend returns { run_id }
    → useAgentStream(runId) opens EventSource
    → SSE events update useAgentStore
    → AgentPipeline re-renders status cards
    → On agent:complete, results flow to useSessionStore
    → ModelViewer loads GLB from modelUrl
    → EducationalPanel displays annotations + quiz
```

### Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useAgentStream.ts` | SSE subscription hook — parses events and routes to stores |
| `src/stores/useAgentStore.ts` | Zustand store for agent/pipeline state |
| `src/stores/useSessionStore.ts` | Zustand store for session data |
| `src/lib/api/client.ts` | Typed API client for backend REST calls |
| `src/components/viewer/ModelViewer.tsx` | model-viewer web component wrapper |
| `src/types/agent.ts` | TypeScript types for agents, events, annotations, educational content |
| `src/app/api/agents/stream/route.ts` | SSE proxy — forwards backend SSE to client |

## Deployment

Deploy to Vercel:

1. Import the repo, set root directory to `frontend/`
2. Set environment variables in Vercel dashboard
3. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
4. Deploy — `vercel.json` configures the build

## Known Issues

- `@google/model-viewer` npm package causes SSR build failures — loaded via CDN `<Script>` tag instead
- `npm install` requires `--legacy-peer-deps` due to `next-auth` v5 beta peer dependency conflicts
- Vercel Hobby plan has a 25-second streaming timeout — consider Vercel Pro for long pipeline runs, or use the direct backend SSE URL

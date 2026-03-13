# Development Roadmap

## Completed: Phase 1 — Proof of Concept (Current)

The foundation is built and functional end-to-end in mock mode.

- [x] **Backend core** — FastAPI server with config, async pipeline orchestrator, SSE event bus, in-memory session store
- [x] **4 AI agents** — Pedagogical (LLM refinement), Execution (mock 3D + Meshy client), Safeguard (LLM safety validation with retry), Tutor (LLM + web search educational content)
- [x] **LLM abstraction** — Unified client supporting both Claude (Anthropic) and OpenAI, switchable via `LLM_PROVIDER`
- [x] **REST + SSE API** — Generation trigger, session CRUD, real-time pipeline streaming
- [x] **Frontend** — Next.js 16 with App Router, landing page, creation workspace, session history, student viewer
- [x] **3D viewer** — Google model-viewer via CDN with WebXR/AR support and annotation overlay
- [x] **Agent pipeline UI** — Real-time status cards, progress bars, and log display
- [x] **State management** — Zustand stores for agent state and session data, SSE hook
- [x] **Auth scaffold** — NextAuth v5 with Google OAuth provider
- [x] **Deploy configs** — Vercel (`vercel.json`), Railway (`Dockerfile` + `railway.toml`)

---

## Phase 2 — Live 3D Generation & Polish

Goal: Connect real 3D generation, improve UI quality, and deploy to production.

- [x] **Meshy API integration** — Two-stage text-to-3d pipeline: preview (untextured mesh) → refine (PBR textured model). Preview model shown at 50% while refine runs. Graceful fallback if refine fails. All model URLs proxied through backend to avoid CORS.
- [x] **Production deployment** — Frontend on Vercel, backend on Railway (serverless mode). CORS configured for cross-origin SSE + API.
- [ ] **Image preview step** — Show the intermediate generated image before 3D conversion; allow teacher to approve/reject before costly 3D generation
- [ ] **Model caching** — Cache generated GLB models (CDN or object storage) so repeated requests don't regenerate
- [ ] **Refined prompt preview** — Show the Pedagogical Agent's refined prompt to teachers with an "Edit & Approve" step before generation
- [ ] **Improved error handling** — User-friendly error toasts, retry buttons, graceful SSE reconnection
- [ ] **Loading states** — Skeleton screens, progress percentages, estimated time remaining
- [ ] **Responsive polish** — Optimize layout for Chromebook (1366x768), tablet, and mobile viewports
- [ ] **Environment variables validation** — Startup checks that required API keys are set

---

## Phase 3 — Human-in-the-Loop Workflow

Goal: Implement the paper's "human-in-the-loop" design to preserve teacher agency.

- [ ] **Teacher approval gates** — Pause pipeline after Pedagogical Agent for teacher to review/edit the refined prompt
- [ ] **Content preview & edit** — After Safeguard approval, let teacher preview 3D model + annotations and make adjustments before publishing to students
- [ ] **Re-generation controls** — "Regenerate with this feedback" button that passes teacher notes back to the Execution Agent
- [ ] **Annotation editing** — Teachers can add, edit, or remove Tutor Agent annotations in the 3D viewer
- [ ] **Session versioning** — Track multiple generation attempts per session with rollback

---

## Phase 4 — Student Experience

Goal: Build the real-time collaborative classroom experience shown in the mockup.

- [ ] **WebSocket classroom sessions** — Real-time connection between teacher dashboard and student viewers
- [ ] **Student join flow** — Session codes or links for students to join a classroom session
- [ ] **Live model sync** — Teacher can push new content to all connected students in real-time
- [ ] **Student interaction tracking** — Track which annotations students view, quiz answers, time spent
- [ ] **Student annotations** — Students can place their own annotations/notes on the 3D model
- [ ] **AR mode guidance** — On-screen instructions for students using AR on mobile/tablet devices

---

## Phase 5 — Persistence & Content Library

Goal: Add durable storage and content reuse.

- [ ] **PostgreSQL database** — Migrate from in-memory to PostgreSQL (Railway provides managed Postgres)
- [ ] **User accounts** — Full auth with teacher profiles, class management, student roster
- [ ] **Content library** — Searchable library of previously generated 3D scenes, filterable by subject/grade
- [ ] **Content sharing** — Teachers can share scenes with other teachers; fork and customize
- [ ] **Export functionality** — Download GLB files, export lesson plans as PDF, export quiz data as CSV
- [ ] **Asset management** — Upload custom 3D models, images, and reference materials

---

## Phase 6 — Advanced Agents & Quality

Goal: Improve agent intelligence and content quality.

- [ ] **Vision-based Safeguard** — Safeguard Agent analyzes the actual rendered 3D model screenshot (not just the generation prompt)
- [ ] **Curriculum standards mapping** — Pedagogical Agent maps content to NGSS, Common Core, or state-specific standards
- [ ] **Multi-model generation** — Execution Agent generates multiple 3D model options for teacher to choose from
- [ ] **Interactive 3D elements** — Tutor Agent generates clickable/hoverable hotspots in 3D space (not just overlay annotations)
- [ ] **Differentiated instruction** — Tutor Agent creates multiple difficulty levels of the same content for different learners
- [ ] **Agent memory** — Agents learn from teacher feedback over time to improve prompt refinement and content quality
- [ ] **Evaluation metrics** — Automated quality scoring of generated content (educational value, accuracy, engagement)

---

## Phase 7 — Scale & Production

Goal: Production hardening for school district deployments.

- [ ] **Rate limiting** — Per-user and per-school API limits to manage LLM/Meshy costs
- [ ] **Job queue** — Replace `asyncio.create_task` with a proper job queue (e.g., Celery, ARQ + Redis) for reliability
- [ ] **Observability** — Structured logging, error tracking (Sentry), pipeline metrics (latency, success rates per agent)
- [ ] **Cost tracking** — Track LLM token usage and 3D generation costs per session/user
- [ ] **Multi-tenant** — School/district isolation, admin dashboards, usage analytics
- [ ] **SSO integration** — Support for school SSO systems (SAML, Clever, ClassLink) beyond Google OAuth
- [ ] **Accessibility** — WCAG 2.1 AA compliance, screen reader support for 3D viewer, keyboard navigation
- [ ] **Offline support** — Cache generated content for use without internet (PWA with Service Worker)

---

## Phase 8 — Research & Evaluation

Goal: Support the usability studies described in the paper.

- [ ] **Telemetry & analytics** — Instrument user interactions for research data collection (opt-in, IRB-compliant)
- [ ] **A/B testing framework** — Compare different agent configurations (e.g., prompt strategies, LLM models)
- [ ] **Teacher survey integration** — In-app surveys after content creation sessions
- [ ] **Student learning assessment** — Pre/post quiz comparisons to measure learning outcomes
- [ ] **Session replay** — Record and replay teacher creation sessions for research analysis
- [ ] **Benchmark suite** — Standardized prompts and evaluation criteria for measuring agent performance

---

## Technology Considerations for Future Phases

| Need | Options | Notes |
|------|---------|-------|
| Database | PostgreSQL (Railway) | Session persistence, user data |
| Job Queue | ARQ + Redis, or Celery | Reliable long-running task execution |
| Object Storage | S3, Cloudflare R2 | Generated 3D model file storage |
| Real-time (bidirectional) | WebSockets | Classroom session sync |
| Search | PostgreSQL full-text, or Typesense | Content library search |
| Monitoring | Sentry, Datadog | Error tracking and performance |
| CDN | Cloudflare, Vercel Edge | 3D model delivery performance |

# Agent System

## Overview

The K12 XR platform uses a multi-agent architecture where four specialized AI agents collaborate in a sequential pipeline to transform a teacher's natural language prompt into safe, curriculum-aligned, interactive 3D educational content.

## Base Agent Contract

All agents extend `BaseAgent` defined in `backend/app/agents/base.py`.

### BaseAgent

```python
class BaseAgent(ABC):
    agent_id: str           # Unique identifier (e.g., "pedagogical")
    display_name: str       # Human-readable name (e.g., "Pedagogical Agent")
    status: AgentStatus     # Current execution status

    async def run(context, event_callback) -> AgentResult   # Wrapper with status tracking + events
    async def execute(context) -> AgentResult               # Core logic (implement this)
    async def emit_progress(event_callback, progress, msg)  # Helper for progress events
```

### AgentContext

A shared mutable dataclass that flows through all agents, accumulating outputs:

```python
@dataclass
class AgentContext:
    # Inputs (set at pipeline start)
    session_id: str
    original_prompt: str
    grade_level: Optional[str]
    subject: Optional[str]

    # Accumulated by agents
    refined_prompt: Optional[str]       # ← Pedagogical
    image_url: Optional[str]            # ← Execution
    model_url: Optional[str]            # ← Execution
    safety_approved: bool               # ← Safeguard
    safety_feedback: Optional[str]      # ← Safeguard
    annotations: list[dict]             # ← Tutor
    educational_content: Optional[dict] # ← Tutor

    retry_count: int = 0                # Tracks Safeguard retry attempts
```

### AgentResult

Returned by every agent execution:

```python
@dataclass
class AgentResult:
    success: bool                  # Whether the agent completed successfully
    agent_id: str                  # Which agent produced this result
    output: dict                   # Agent-specific output data
    error: Optional[str]           # Error message if success=False
    duration_ms: float             # Execution time
```

### AgentStatus Enum

```python
class AgentStatus(str, Enum):
    IDLE = "idle"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
```

## Agent Descriptions

### 1. Pedagogical Agent

**File:** `backend/app/agents/pedagogical.py`
**Purpose:** Transforms a teacher's simple prompt into a detailed, curriculum-aligned prompt optimized for 3D content generation.

**Input:** `context.original_prompt`, `context.grade_level`, `context.subject`
**Output:**
```json
{
    "refined_prompt": "Generate a scientifically accurate 3D model...",
    "learning_objectives": ["Identify the four chambers of the heart", "..."],
    "key_features": ["Left/right atria", "Left/right ventricles", "..."],
    "subject_area": "science",
    "complexity_level": "middle"
}
```

**System Prompt Summary:** Acts as a K-12 Pedagogical Expert. Identifies the core educational concept, determines appropriate detail for grade level, specifies scientific accuracy requirements, visual features, rendering optimization, and educational labeling.

**LLM Method:** `llm_client.chat_json()` at temperature 0.5

---

### 2. Execution Agent

**File:** `backend/app/agents/execution.py`
**Purpose:** Generates a 3D model from the refined prompt.

**Input:** `context.refined_prompt` (falls back to `context.original_prompt`)

**Two modes:**

| Mode | Trigger | Behavior |
|------|---------|----------|
| Mock | `MOCK_3D=true` | Returns a sample GLB from KhronosGroup (2s simulated delay) |
| Real | `MOCK_3D=false` | Calls Meshy API: text→image, then image→3D (1-5 min) |

**Mock model selection:** Based on `context.subject`:
- science/biology/chemistry → `BrainStem.glb`
- art → `Suzanne.gltf`
- default → `DamagedHelmet.glb`

**Output:**
```json
{
    "image_url": "https://...",
    "model_url": "https://...DamagedHelmet.glb",
    "format": "glb",
    "mock": true
}
```

**No LLM call.** This agent calls external 3D generation APIs.

---

### 3. Safeguard Agent

**File:** `backend/app/agents/safeguard.py`
**Purpose:** Validates that generated content is appropriate for K-12 classrooms.

**Input:** `context.original_prompt`, `context.refined_prompt`, `context.image_url`, `context.grade_level`, `context.safety_feedback` (for retries)

**Checks performed:**
1. Age-appropriateness for the specified grade level
2. Scientific/factual accuracy
3. No violent, sexual, or disturbing imagery
4. No racial, gender, cultural, or other biases
5. Educational value alignment

**Output:**
```json
{
    "approved": true,
    "confidence": 0.95,
    "feedback": "Content is appropriate for middle school biology",
    "concerns": [],
    "suggestions": ["Consider adding labels for each chamber"]
}
```

**Retry behavior:** If `approved=false`, the pipeline retries Execution→Safeguard up to `max_safety_retries` (default 3) times. Previous `safety_feedback` is passed to the next attempt so the agent can learn from prior failures.

**LLM Method:** `llm_client.chat_json()` — uses vision if a real image is available, text-only evaluation in mock mode.

---

### 4. Tutor Agent

**File:** `backend/app/agents/tutor.py`
**Purpose:** Enriches the 3D scene with educational content suitable for the target audience.

**Input:** `context.refined_prompt`, `context.original_prompt`, `context.grade_level`, `context.subject`

**Process:**
1. Performs web research via Tavily API for accurate, up-to-date information
2. Passes research context + prompt details to LLM
3. LLM generates structured educational content

**Output:**
```json
{
    "annotations": [
        {
            "id": "ann_1",
            "label": "Left Ventricle",
            "description": "The left ventricle pumps oxygenated blood...",
            "position_hint": "left"
        }
    ],
    "educational_content": {
        "title": "The Human Heart",
        "overview": "The heart is a muscular organ...",
        "key_facts": ["The heart beats ~100,000 times per day", "..."],
        "vocabulary": [
            { "term": "Ventricle", "definition": "A chamber of the heart..." }
        ],
        "quiz_questions": [
            {
                "question": "How many chambers does the human heart have?",
                "options": ["2", "3", "4", "5"],
                "correct_answer": 2,
                "explanation": "The heart has four chambers: two atria and two ventricles."
            }
        ],
        "fun_facts": ["A blue whale's heart is the size of a small car!"],
        "further_reading": ["Circulatory system", "Blood vessels"]
    }
}
```

**LLM Method:** `llm_client.chat_json()` at temperature 0.6, max_tokens 4096

---

## Pipeline Orchestration

**File:** `backend/app/orchestrator/pipeline.py`

The `PipelineOrchestrator` manages the full lifecycle:

```
run(session_id, prompt, grade_level, subject)
│
├── Create session in memory store
├── Generate run_id for SSE subscription
├── Spawn async task: _execute_pipeline()
└── Return run_id immediately
         │
         ▼
_execute_pipeline()
│
├── Emit: pipeline:start
├── Run Pedagogical Agent
│   └── Update context.refined_prompt
├── RETRY LOOP (max_safety_retries):
│   ├── Run Execution Agent
│   │   └── Update context.image_url, context.model_url
│   ├── Run Safeguard Agent
│   │   ├── If approved → break loop
│   │   └── If rejected → set context.safety_feedback, continue
│   └── If max retries exceeded → fail pipeline
├── Run Tutor Agent
│   └── Update context.annotations, context.educational_content
├── Update session in store (status=completed)
├── Emit: pipeline:complete (with all final data)
└── Close SSE stream
```

## Event System

**File:** `backend/app/orchestrator/events.py`

The `EventBus` uses asyncio Queues to fan out events to multiple SSE subscribers:

- `subscribe(run_id)` → returns an `asyncio.Queue`
- `emit(run_id, event, data)` → pushes to all subscriber queues for that run_id
- `close(run_id)` → sends `None` sentinel to signal end-of-stream
- `format_sse(event)` → serializes to SSE text format (`event: ...\ndata: ...\n\n`)

## Adding a New Agent

1. Create `backend/app/agents/my_agent.py`
2. Subclass `BaseAgent`, implement `execute(context: AgentContext) -> AgentResult`
3. Add the agent instance to `PipelineOrchestrator.__init__()` in `pipeline.py`
4. Insert the agent call at the appropriate point in `_execute_pipeline()`
5. Add any new fields to `AgentContext` if the agent produces new data
6. Update frontend `AgentId` type and `AGENT_DEFINITIONS` in `types/agent.ts`
7. Update `useAgentStore` initial state to include the new agent

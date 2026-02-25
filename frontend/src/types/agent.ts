export type AgentId = "pedagogical" | "execution" | "safeguard" | "tutor";

export type AgentStatusType =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "error";

export interface AgentStatus {
  id: AgentId;
  displayName: string;
  status: AgentStatusType;
  progress: number;
  message: string;
  startedAt?: string;
  completedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
}

export interface AgentLogEntry {
  agentId: AgentId;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
}

export type PipelineStatus = "idle" | "running" | "completed" | "error";

export interface SSEAgentEvent {
  agent_id: AgentId;
  display_name?: string;
  message?: string;
  progress?: number;
  result?: Record<string, unknown>;
  error?: string;
  duration_ms?: number;
  model_url?: string;
}

export interface SSEPipelineCompleteEvent {
  session_id: string;
  model_url: string;
  image_url?: string;
  refined_prompt: string;
  annotations: Annotation[];
  educational_content?: EducationalContent;
}

export interface SSEPipelineErrorEvent {
  failed_agent: string;
  error: string;
}

export interface Annotation {
  id: string;
  label: string;
  description: string;
  position_hint?: string;
}

export interface EducationalContent {
  title: string;
  overview: string;
  key_facts: string[];
  vocabulary: { term: string; definition: string }[];
  quiz_questions: {
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
  }[];
  fun_facts: string[];
  further_reading: string[];
}

export const AGENT_DEFINITIONS: Record<
  AgentId,
  { displayName: string; description: string; icon: string }
> = {
  pedagogical: {
    displayName: "Pedagogical Agent",
    description: "Refining prompt with curriculum alignment",
    icon: "📚",
  },
  execution: {
    displayName: "Execution Agent",
    description: "Generating 3D content",
    icon: "🎨",
  },
  safeguard: {
    displayName: "Safeguard Agent",
    description: "Validating K-12 safety",
    icon: "🛡️",
  },
  tutor: {
    displayName: "Tutor Agent",
    description: "Creating educational content",
    icon: "🎓",
  },
};

import { create } from "zustand";
import type {
  AgentId,
  AgentStatus,
  AgentLogEntry,
  PipelineStatus,
  AGENT_DEFINITIONS,
} from "@/types/agent";

interface AgentStoreState {
  agents: Record<AgentId, AgentStatus>;
  pipelineStatus: PipelineStatus;
  logs: AgentLogEntry[];

  // Actions
  updateAgent: (agentId: AgentId, update: Partial<AgentStatus>) => void;
  appendLog: (entry: AgentLogEntry) => void;
  setPipelineStatus: (status: PipelineStatus) => void;
  resetPipeline: () => void;
}

const createInitialAgent = (
  id: AgentId,
  displayName: string
): AgentStatus => ({
  id,
  displayName,
  status: "idle",
  progress: 0,
  message: "",
});

export const useAgentStore = create<AgentStoreState>((set) => ({
  agents: {
    pedagogical: createInitialAgent("pedagogical", "Pedagogical Agent"),
    execution: createInitialAgent("execution", "Execution Agent"),
    safeguard: createInitialAgent("safeguard", "Safeguard Agent"),
    tutor: createInitialAgent("tutor", "Tutor Agent"),
  },
  pipelineStatus: "idle",
  logs: [],

  updateAgent: (agentId, update) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: { ...state.agents[agentId], ...update },
      },
    })),

  appendLog: (entry) =>
    set((state) => ({
      logs: [...state.logs, entry],
    })),

  setPipelineStatus: (status) =>
    set({ pipelineStatus: status }),

  resetPipeline: () =>
    set({
      agents: {
        pedagogical: createInitialAgent("pedagogical", "Pedagogical Agent"),
        execution: createInitialAgent("execution", "Execution Agent"),
        safeguard: createInitialAgent("safeguard", "Safeguard Agent"),
        tutor: createInitialAgent("tutor", "Tutor Agent"),
      },
      pipelineStatus: "idle",
      logs: [],
    }),
}));

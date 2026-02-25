"use client";

import { useAgentStore } from "@/stores/useAgentStore";
import { AgentStatusCard } from "./AgentStatusCard";
import type { AgentId } from "@/types/agent";

const AGENT_ORDER: AgentId[] = [
  "pedagogical",
  "execution",
  "safeguard",
  "tutor",
];

export function AgentPipeline() {
  const agents = useAgentStore((s) => s.agents);
  const pipelineStatus = useAgentStore((s) => s.pipelineStatus);

  return (
    <div className="w-full">
      {/* Pipeline header */}
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-semibold text-gray-700">Agent Pipeline</h3>
        {pipelineStatus !== "idle" && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              pipelineStatus === "running"
                ? "bg-blue-100 text-blue-700"
                : pipelineStatus === "completed"
                ? "bg-green-100 text-green-700"
                : pipelineStatus === "error"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {pipelineStatus}
          </span>
        )}
      </div>

      {/* Agent cards in a horizontal row with connecting arrows */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {AGENT_ORDER.map((id, index) => (
          <div key={id} className="flex items-center gap-2">
            <AgentStatusCard agent={agents[id]} />
            {index < AGENT_ORDER.length - 1 && (
              <svg
                className="w-5 h-5 text-gray-300 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

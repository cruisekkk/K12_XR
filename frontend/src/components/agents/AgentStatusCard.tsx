"use client";

import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types/agent";
import { AGENT_DEFINITIONS } from "@/types/agent";

interface AgentStatusCardProps {
  agent: AgentStatus;
}

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const def = AGENT_DEFINITIONS[agent.id];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border px-4 py-3 transition-all min-w-[140px]",
        agent.status === "idle" && "border-gray-200 bg-gray-50 opacity-60",
        agent.status === "queued" && "border-blue-200 bg-blue-50",
        agent.status === "running" &&
          "border-blue-400 bg-blue-50 shadow-md shadow-blue-100",
        agent.status === "completed" && "border-green-400 bg-green-50",
        agent.status === "error" && "border-red-400 bg-red-50"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{def.icon}</span>
        <span className="text-xs font-semibold text-gray-700">
          {def.displayName}
        </span>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            agent.status === "idle" && "bg-gray-300",
            agent.status === "queued" && "bg-blue-300",
            agent.status === "running" && "bg-blue-500 animate-pulse",
            agent.status === "completed" && "bg-green-500",
            agent.status === "error" && "bg-red-500"
          )}
        />
        <span className="text-[10px] text-gray-500 capitalize">
          {agent.status}
        </span>
      </div>

      {/* Progress bar */}
      {agent.status === "running" && (
        <div className="w-full h-1 bg-blue-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${agent.progress}%` }}
          />
        </div>
      )}

      {/* Message */}
      {agent.message && (
        <p className="text-[10px] text-gray-500 text-center line-clamp-1 max-w-[130px]">
          {agent.message}
        </p>
      )}

      {/* Duration */}
      {agent.durationMs !== undefined && agent.status === "completed" && (
        <span className="text-[10px] text-gray-400">
          {(agent.durationMs / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

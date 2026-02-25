"use client";

import { useAgentStore } from "@/stores/useAgentStore";
import { AGENT_DEFINITIONS } from "@/types/agent";

export function AgentLog() {
  const logs = useAgentStore((s) => s.logs);

  if (logs.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-2 max-h-[120px] overflow-y-auto">
      <h4 className="text-xs font-semibold text-gray-400 mb-2">Agent Log</h4>
      <div className="space-y-1 font-mono">
        {logs.map((log, i) => {
          const def = AGENT_DEFINITIONS[log.agentId];
          return (
            <div key={i} className="flex gap-2 text-[11px]">
              <span className="text-gray-500 flex-shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`flex-shrink-0 ${
                  log.level === "error"
                    ? "text-red-400"
                    : log.level === "warn"
                    ? "text-yellow-400"
                    : "text-blue-400"
                }`}
              >
                [{def?.displayName || log.agentId}]
              </span>
              <span className="text-gray-300">{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

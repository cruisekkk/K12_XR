"use client";

import { useEffect, useRef } from "react";
import { useAgentStore } from "@/stores/useAgentStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { api } from "@/lib/api/client";
import type {
  AgentId,
  SSEAgentEvent,
  SSEPipelineCompleteEvent,
  SSEPipelineErrorEvent,
} from "@/types/agent";

export function useAgentStream(runId: string | null) {
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const appendLog = useAgentStore((s) => s.appendLog);
  const setPipelineStatus = useAgentStore((s) => s.setPipelineStatus);
  const setRefinedPrompt = useSessionStore((s) => s.setRefinedPrompt);
  const setModelUrl = useSessionStore((s) => s.setModelUrl);
  const setImageUrl = useSessionStore((s) => s.setImageUrl);
  const setAnnotations = useSessionStore((s) => s.setAnnotations);
  const setEducationalContent = useSessionStore((s) => s.setEducationalContent);

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!runId) return;

    const url = api.getStreamUrl(runId);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("agent:start", (e) => {
      const data: SSEAgentEvent = JSON.parse(e.data);
      updateAgent(data.agent_id, {
        status: "running",
        message: data.message || "Starting...",
        progress: 0,
      });
      appendLog({
        agentId: data.agent_id,
        level: "info",
        message: data.message || `${data.display_name} started`,
        timestamp: new Date().toISOString(),
      });
    });

    es.addEventListener("agent:progress", (e) => {
      const data: SSEAgentEvent = JSON.parse(e.data);
      updateAgent(data.agent_id, {
        progress: data.progress || 0,
        message: data.message || "",
      });

      // Execution agent sends proxied model_url in progress event
      if (data.agent_id === "execution" && data.model_url) {
        setModelUrl(api.resolveUrl(data.model_url as string));
      }
    });

    es.addEventListener("agent:complete", (e) => {
      const data: SSEAgentEvent = JSON.parse(e.data);
      updateAgent(data.agent_id, {
        status: "completed",
        progress: 100,
        message: data.message || "Completed",
        result: data.result,
        durationMs: data.duration_ms,
      });
      appendLog({
        agentId: data.agent_id,
        level: "info",
        message: data.message || "Completed",
        timestamp: new Date().toISOString(),
      });

      // Update session store based on agent outputs
      if (data.agent_id === "pedagogical" && data.result?.refined_prompt) {
        setRefinedPrompt(data.result.refined_prompt as string);
      }
      if (data.agent_id === "execution") {
        if (data.result?.model_url) setModelUrl(api.resolveUrl(data.result.model_url as string));
        if (data.result?.image_url) setImageUrl(api.resolveUrl(data.result.image_url as string));
      }
    });

    es.addEventListener("agent:error", (e) => {
      const data: SSEAgentEvent = JSON.parse(e.data);
      updateAgent(data.agent_id, {
        status: "error",
        message: data.error || "Error occurred",
        error: data.error,
      });
      appendLog({
        agentId: data.agent_id,
        level: "error",
        message: data.error || "Error",
        timestamp: new Date().toISOString(),
      });
    });

    es.addEventListener("pipeline:start", () => {
      setPipelineStatus("running");
    });

    es.addEventListener("pipeline:complete", (e) => {
      const data: SSEPipelineCompleteEvent = JSON.parse(e.data);
      setPipelineStatus("completed");
      if (data.model_url) setModelUrl(api.resolveUrl(data.model_url));
      if (data.image_url) setImageUrl(api.resolveUrl(data.image_url));
      if (data.refined_prompt) setRefinedPrompt(data.refined_prompt);
      if (data.annotations) setAnnotations(data.annotations);
      if (data.educational_content) setEducationalContent(data.educational_content);
      es.close();
    });

    es.addEventListener("pipeline:error", (e) => {
      const data: SSEPipelineErrorEvent = JSON.parse(e.data);
      setPipelineStatus("error");
      appendLog({
        agentId: data.failed_agent as AgentId,
        level: "error",
        message: data.error,
        timestamp: new Date().toISOString(),
      });
      es.close();
    });

    es.addEventListener("stream:end", () => {
      es.close();
    });

    es.onerror = () => {
      // EventSource auto-reconnects on error
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [
    runId,
    updateAgent,
    appendLog,
    setPipelineStatus,
    setRefinedPrompt,
    setModelUrl,
    setImageUrl,
    setAnnotations,
    setEducationalContent,
  ]);
}

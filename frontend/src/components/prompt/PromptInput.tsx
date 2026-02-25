"use client";

import { useState, useCallback } from "react";
import { useSessionStore } from "@/stores/useSessionStore";
import { useAgentStore } from "@/stores/useAgentStore";
import { api } from "@/lib/api/client";

const SUGGESTIONS = [
  "3D model of a human heart for middle school biology class",
  "Solar system model showing planet sizes and orbits for 5th grade science",
  "DNA double helix structure for high school biology",
  "Ancient Egyptian pyramid cross-section for 6th grade history",
  "Water molecule (H2O) showing atomic bonds for chemistry class",
  "Volcano cross-section showing layers and magma for earth science",
];

export function PromptInput() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prompt = useSessionStore((s) => s.prompt);
  const setPrompt = useSessionStore((s) => s.setPrompt);
  const gradeLevel = useSessionStore((s) => s.gradeLevel);
  const setGradeLevel = useSessionStore((s) => s.setGradeLevel);
  const subject = useSessionStore((s) => s.subject);
  const setSubject = useSessionStore((s) => s.setSubject);
  const setSession = useSessionStore((s) => s.setSession);
  const resetSession = useSessionStore((s) => s.reset);
  const resetPipeline = useAgentStore((s) => s.resetPipeline);
  const setPipelineStatus = useAgentStore((s) => s.setPipelineStatus);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const pipelineStatus = useAgentStore((s) => s.pipelineStatus);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    resetPipeline();

    // Set pipeline and first agent to running immediately so UI updates
    // before SSE events arrive (eliminates the gap where button is clickable)
    setPipelineStatus("running");
    updateAgent("pedagogical", {
      status: "running",
      message: "Starting...",
      progress: 0,
    });

    try {
      const response = await api.generate({
        prompt: prompt.trim(),
        grade_level: gradeLevel || undefined,
        subject: subject || undefined,
      });
      setSession(response.session_id, response.run_id);
    } catch (error) {
      console.error("Failed to start generation:", error);
      // Reset on error so user can retry
      setPipelineStatus("error");
      updateAgent("pedagogical", {
        status: "error",
        message: "Failed to start",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [prompt, gradeLevel, subject, isSubmitting, setSession, resetPipeline, setPipelineStatus, updateAgent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isRunning = pipelineStatus === "running";
  const isDisabled = isRunning || isSubmitting;

  return (
    <div className="space-y-2">
      {/* Suggestions */}
      {!isDisabled && !prompt && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.slice(0, 3).map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              {suggestion.length > 50
                ? suggestion.slice(0, 50) + "..."
                : suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-3">
        {/* Grade & Subject selectors */}
        <div className="flex gap-2 flex-shrink-0">
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            disabled={isDisabled}
          >
            <option value="">Grade Level</option>
            <option value="K-2">K-2</option>
            <option value="3-5">3-5</option>
            <option value="6-8">6-8 (Middle)</option>
            <option value="9-12">9-12 (High)</option>
          </select>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            disabled={isDisabled}
          >
            <option value="">Subject</option>
            <option value="Science">Science</option>
            <option value="Biology">Biology</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Physics">Physics</option>
            <option value="Math">Math</option>
            <option value="History">History</option>
            <option value="Arts">Arts</option>
            <option value="Literature">Literature</option>
          </select>
        </div>

        {/* Prompt textarea */}
        <div className="flex-1 relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the 3D educational content you want to create..."
            rows={1}
            disabled={isDisabled}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-700"
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isDisabled}
          className="flex-shrink-0 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Starting..." : isRunning ? "Running..." : "Generate"}
        </button>
      </div>
    </div>
  );
}

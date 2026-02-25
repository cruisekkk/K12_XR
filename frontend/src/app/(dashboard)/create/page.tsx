"use client";

import { useState } from "react";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useSessionStore } from "@/stores/useSessionStore";
import { useAgentStore } from "@/stores/useAgentStore";
import { ModelViewer } from "@/components/viewer/ModelViewer";
import { AgentPipeline } from "@/components/agents/AgentPipeline";
import { AgentLog } from "@/components/agents/AgentLog";
import { PromptInput } from "@/components/prompt/PromptInput";
import { StudentViewGrid } from "@/components/session/StudentViewGrid";
import { EducationalPanel } from "@/components/viewer/EducationalPanel";

const MOCK_MODEL_URL = "/model.glb";

export default function CreatePage() {
  const runId = useSessionStore((s) => s.runId);
  const modelUrl = useSessionStore((s) => s.modelUrl);
  const annotations = useSessionStore((s) => s.annotations);
  const educationalContent = useSessionStore((s) => s.educationalContent);
  const refinedPrompt = useSessionStore((s) => s.refinedPrompt);
  const pipelineStatus = useAgentStore((s) => s.pipelineStatus);
  const [showEduPanel, setShowEduPanel] = useState(false);

  // Connect to SSE stream when we have a runId
  useAgentStream(runId);

  const isGenerating = pipelineStatus === "running";
  const isMockActive = modelUrl === MOCK_MODEL_URL;
  const hasEduContent = !!(educationalContent || annotations.length > 0 || refinedPrompt);

  const toggleMock = () => {
    if (isMockActive) {
      useSessionStore.getState().setModelUrl("");
      useAgentStore.getState().setPipelineStatus("idle");
    } else {
      useSessionStore.getState().setModelUrl(MOCK_MODEL_URL);
      useAgentStore.getState().setPipelineStatus("completed");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            XR Content Creator
          </h2>
          <p className="text-xs text-gray-500">
            Create immersive 3D educational content with AI agents
          </p>
        </div>
        <button
          onClick={toggleMock}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
            isMockActive
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 hover:bg-indigo-700"
              : "text-gray-700 bg-white border-gray-300 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm"
          }`}
        >
          {isMockActive ? "Mock Active" : "Quick Mock"}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: 3D Viewer */}
        <div className="flex-1 relative flex flex-col p-4 overflow-hidden">
          {/* 3D Viewer — fills all available height */}
          <ModelViewer
            modelUrl={modelUrl}
            annotations={annotations}
            isLoading={isGenerating && !modelUrl}
            className="flex-1"
          />

          {/* Info button — floating over bottom-right of viewer */}
          {hasEduContent && (
            <button
              onClick={() => setShowEduPanel(true)}
              className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Content Info
            </button>
          )}
        </div>

        {/* Right: Student View Grid */}
        <div className="w-64 border-l border-gray-200 bg-white p-4 overflow-y-auto hidden lg:block">
          <StudentViewGrid />
        </div>
      </div>

      {/* Bottom: Agent Pipeline + Prompt Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-2 space-y-2">
        {/* Agent Pipeline Status */}
        <AgentPipeline />

        {/* Agent Log (collapsible) */}
        <AgentLog />

        {/* Prompt Input */}
        <PromptInput />
      </div>

      {/* Educational Content Dialog */}
      {showEduPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowEduPanel(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-xl m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowEduPanel(false)}
              className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <EducationalPanel
              content={educationalContent}
              annotations={annotations}
              refinedPrompt={refinedPrompt}
            />
          </div>
        </div>
      )}
    </div>
  );
}

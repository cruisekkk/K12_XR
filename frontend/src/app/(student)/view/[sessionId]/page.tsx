"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { ModelViewer } from "@/components/viewer/ModelViewer";
import { EducationalPanel } from "@/components/viewer/EducationalPanel";
import type { Session } from "@/types/session";

export default function StudentViewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSession(sessionId)
      .then(setSession)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-2">⏳</div>
          <p className="text-sm text-gray-500">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-3xl mb-2">❌</div>
          <p className="text-sm text-gray-500">{error || "Session not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-800">
              {session.educational_content?.title || session.prompt}
            </h1>
            {session.subject && (
              <span className="text-xs text-gray-500">{session.subject}</span>
            )}
          </div>
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
            Student View
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewer */}
        <div className="flex-1 p-4">
          <ModelViewer
            modelUrl={session.model_url ?? null}
            annotations={session.annotations}
            className="h-full"
          />
        </div>

        {/* Educational Panel */}
        <div className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto">
          <EducationalPanel
            content={session.educational_content || null}
            annotations={session.annotations}
            refinedPrompt={null}
          />
        </div>
      </div>
    </div>
  );
}

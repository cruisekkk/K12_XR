"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Session } from "@/types/session";
import Link from "next/link";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Past Sessions
      </h2>

      {loading ? (
        <div className="text-sm text-gray-500">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-30">📂</div>
          <p className="text-sm text-gray-500">No sessions yet</p>
          <Link
            href="/create"
            className="text-sm text-blue-600 hover:underline mt-2 inline-block"
          >
            Create your first XR content
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    session.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : session.status === "running"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {session.status}
                </span>
                {session.subject && (
                  <span className="text-xs text-gray-500">
                    {session.subject}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-2">
                {session.prompt}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(session.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

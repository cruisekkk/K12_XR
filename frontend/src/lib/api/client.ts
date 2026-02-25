import type { GenerateRequest, GenerateResponse, Session } from "@/types/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  generate: (request: GenerateRequest) =>
    fetchAPI<GenerateResponse>("/api/generate", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  getSessions: () => fetchAPI<Session[]>("/api/sessions"),

  getSession: (sessionId: string) =>
    fetchAPI<Session>(`/api/sessions/${sessionId}`),

  deleteSession: (sessionId: string) =>
    fetchAPI<{ status: string }>(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    }),

  getStreamUrl: (runId: string) => `${API_URL}/api/pipeline/${runId}/stream`,

  /** Resolve a backend-relative URL (e.g. /api/proxy/model?url=...) to an absolute URL. */
  resolveUrl: (path: string) => {
    if (!path) return path;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${API_URL}${path}`;
  },
};

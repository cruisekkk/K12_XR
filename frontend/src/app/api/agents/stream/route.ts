import { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return new Response("Missing runId parameter", { status: 400 });
  }

  // Proxy SSE from backend to client
  const backendUrl = `${API_URL}/api/pipeline/${runId}/stream`;

  try {
    const backendResponse = await fetch(backendUrl, {
      headers: {
        Accept: "text/event-stream",
      },
    });

    if (!backendResponse.ok || !backendResponse.body) {
      return new Response("Backend stream unavailable", { status: 502 });
    }

    // Forward the stream directly
    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("Failed to connect to backend", { status: 502 });
  }
}

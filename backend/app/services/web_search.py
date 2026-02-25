from typing import Optional
import httpx
from app.config import settings


class WebSearchClient:
    """Web search client using Tavily API for educational research."""

    def __init__(self):
        self._api_key = settings.tavily_api_key

    async def search(self, query: str, max_results: int = 5) -> list[str]:
        """Search the web and return summarized results."""
        if not self._api_key:
            return [f"(Web search unavailable - no API key configured. Query: {query})"]

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": self._api_key,
                        "query": query,
                        "search_depth": "basic",
                        "max_results": max_results,
                        "include_answer": True,
                    },
                )
                response.raise_for_status()
                data = response.json()

                results = []
                # Include the AI-generated answer if available
                if data.get("answer"):
                    results.append(f"Summary: {data['answer']}")

                # Include individual results
                for r in data.get("results", [])[:max_results]:
                    title = r.get("title", "")
                    content = r.get("content", "")
                    results.append(f"{title}: {content[:200]}")

                return results

        except Exception as e:
            return [f"(Web search failed: {str(e)})"]


# Singleton
web_search_client = WebSearchClient()

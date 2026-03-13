import asyncio
import logging
from typing import Callable, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


MESHY_BASE_URL = "https://api.meshy.ai"


class MeshyClient:
    """Client for Meshy 3D generation API."""

    def __init__(self):
        self._api_key = settings.meshy_api_key

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def text_to_3d(
        self, prompt: str, on_progress: Optional[Callable] = None
    ) -> dict:
        """Generate a 3D model preview from text prompt using Meshy v2 API.

        Returns dict with keys: model_url, thumbnail_url, preview_task_id
        """
        async with httpx.AsyncClient(timeout=60) as client:
            # Create text-to-3d preview task
            logger.info(f"[Meshy] Creating text-to-3d task: {prompt[:80]}...")
            response = await client.post(
                f"{MESHY_BASE_URL}/openapi/v2/text-to-3d",
                headers=self._headers(),
                json={
                    "mode": "preview",
                    "prompt": prompt[:600],  # Meshy max 600 chars
                    "ai_model": "meshy-6",
                    "topology": "triangle",
                    "target_polycount": 30000,
                },
            )
            if not response.is_success:
                body = response.text
                raise Exception(
                    f"Meshy text-to-3d failed ({response.status_code}): {body}"
                )
            task_id = response.json().get("result")
            logger.info(f"[Meshy] Task created: {task_id}")

            # Poll for completion
            result = await self._poll_text_to_3d(task_id, on_progress=on_progress)
            result["preview_task_id"] = task_id
            return result

    async def refine_text_to_3d(
        self, preview_task_id: str, on_progress: Optional[Callable] = None
    ) -> dict:
        """Refine a preview task to generate textured model with PBR materials.

        Returns dict with keys: model_url, thumbnail_url
        """
        async with httpx.AsyncClient(timeout=60) as client:
            logger.info(f"[Meshy] Creating refine task for preview: {preview_task_id}")
            response = await client.post(
                f"{MESHY_BASE_URL}/openapi/v2/text-to-3d",
                headers=self._headers(),
                json={
                    "mode": "refine",
                    "preview_task_id": preview_task_id,
                    "enable_pbr": True,
                },
            )
            if not response.is_success:
                body = response.text
                raise Exception(
                    f"Meshy refine failed ({response.status_code}): {body}"
                )
            refine_task_id = response.json().get("result")
            logger.info(f"[Meshy] Refine task created: {refine_task_id}")

            return await self._poll_text_to_3d(
                refine_task_id, max_wait=600, on_progress=on_progress
            )

    async def image_to_3d(self, image_url: str) -> dict:
        """Generate a 3D model from an image using Meshy v1 API.

        Returns dict with keys: model_url, thumbnail_url
        """
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{MESHY_BASE_URL}/openapi/v1/image-to-3d",
                headers=self._headers(),
                json={
                    "image_url": image_url,
                    "ai_model": "meshy-6",
                    "should_texture": True,
                    "enable_pbr": True,
                    "target_polycount": 30000,
                },
            )
            if not response.is_success:
                body = response.text
                raise Exception(
                    f"Meshy image-to-3d failed ({response.status_code}): {body}"
                )
            task_id = response.json().get("result")

            # Poll for completion
            return await self._poll_image_to_3d(task_id)

    async def _poll_text_to_3d(
        self,
        task_id: str,
        max_wait: int = 300,
        interval: int = 5,
        on_progress: Optional[Callable] = None,
    ) -> dict:
        """Poll a text-to-3d task until completion."""
        url = f"{MESHY_BASE_URL}/openapi/v2/text-to-3d/{task_id}"
        return await self._poll_task(url, max_wait, interval, on_progress)

    async def _poll_image_to_3d(
        self, task_id: str, max_wait: int = 300, interval: int = 5
    ) -> dict:
        """Poll an image-to-3d task until completion."""
        url = f"{MESHY_BASE_URL}/openapi/v1/image-to-3d/{task_id}"
        return await self._poll_task(url, max_wait, interval)

    async def _poll_task(
        self,
        url: str,
        max_wait: int,
        interval: int,
        on_progress: Optional[Callable] = None,
    ) -> dict:
        """Generic polling for Meshy tasks. Returns model_url + thumbnail_url."""
        elapsed = 0
        async with httpx.AsyncClient(timeout=30) as client:
            while elapsed < max_wait:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()

                status = data.get("status")
                progress = data.get("progress", 0)

                logger.info(
                    f"[Meshy] Poll: status={status}, progress={progress}%, elapsed={elapsed}s"
                )

                if on_progress:
                    await on_progress(progress, status)

                if status == "SUCCEEDED":
                    model_urls = data.get("model_urls", {})
                    return {
                        "model_url": model_urls.get("glb"),
                        "thumbnail_url": data.get("thumbnail_url"),
                    }
                elif status == "FAILED":
                    raise Exception(
                        f"Meshy task failed: {data.get('message', 'Unknown error')}"
                    )
                elif status == "CANCELED":
                    raise Exception("Meshy task was canceled")

                await asyncio.sleep(interval)
                elapsed += interval

        raise Exception(f"Meshy task timed out after {max_wait}s")


# Singleton
meshy_client = MeshyClient()

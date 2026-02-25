import json
from typing import Optional
from app.config import settings


class LLMClient:
    """Unified LLM client supporting both Claude (Anthropic) and OpenAI."""

    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or settings.llm_provider
        self._anthropic_client = None
        self._openai_client = None

    def _get_anthropic(self):
        if self._anthropic_client is None:
            import anthropic
            self._anthropic_client = anthropic.AsyncAnthropic(
                api_key=settings.anthropic_api_key
            )
        return self._anthropic_client

    def _get_openai(self):
        if self._openai_client is None:
            import openai
            self._openai_client = openai.AsyncOpenAI(
                api_key=settings.openai_api_key
            )
        return self._openai_client

    async def chat(
        self,
        messages: list[dict],
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        if self.provider == "claude":
            return await self._chat_claude(
                messages, system, model, temperature, max_tokens
            )
        else:
            return await self._chat_openai(
                messages, system, model, temperature, max_tokens
            )

    async def chat_with_vision(
        self,
        messages: list[dict],
        image_url: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        if self.provider == "claude":
            return await self._vision_claude(
                messages, image_url, system, model, temperature, max_tokens
            )
        else:
            return await self._vision_openai(
                messages, image_url, system, model, temperature, max_tokens
            )

    async def chat_json(
        self,
        messages: list[dict],
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> dict:
        """Chat and parse response as JSON."""
        response = await self.chat(messages, system, model, temperature, max_tokens)
        # Try to extract JSON from the response
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to find JSON in markdown code blocks
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
                return json.loads(json_str)
            raise

    # -- Claude implementations --

    async def _chat_claude(self, messages, system, model, temperature, max_tokens):
        client = self._get_anthropic()
        kwargs = {
            "model": model or "claude-sonnet-4-20250514",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        response = await client.messages.create(**kwargs)
        return response.content[0].text

    async def _vision_claude(
        self, messages, image_url, system, model, temperature, max_tokens
    ):
        import base64
        import httpx

        client = self._get_anthropic()

        # Download image and convert to base64
        async with httpx.AsyncClient() as http:
            img_response = await http.get(image_url)
            img_data = base64.standard_b64encode(img_response.content).decode()

        content_type = "image/png"
        if image_url.endswith(".jpg") or image_url.endswith(".jpeg"):
            content_type = "image/jpeg"

        # Build message with image
        vision_messages = []
        for msg in messages:
            if msg["role"] == "user" and msg == messages[-1]:
                vision_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": content_type,
                                    "data": img_data,
                                },
                            },
                            {"type": "text", "text": msg["content"]},
                        ],
                    }
                )
            else:
                vision_messages.append(msg)

        kwargs = {
            "model": model or "claude-sonnet-4-20250514",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": vision_messages,
        }
        if system:
            kwargs["system"] = system
        response = await client.messages.create(**kwargs)
        return response.content[0].text

    # -- OpenAI implementations --

    async def _chat_openai(self, messages, system, model, temperature, max_tokens):
        client = self._get_openai()
        oai_messages = []
        if system:
            oai_messages.append({"role": "system", "content": system})
        oai_messages.extend(messages)

        response = await client.chat.completions.create(
            model=model or "gpt-4o",
            messages=oai_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    async def _vision_openai(
        self, messages, image_url, system, model, temperature, max_tokens
    ):
        client = self._get_openai()
        oai_messages = []
        if system:
            oai_messages.append({"role": "system", "content": system})

        for msg in messages:
            if msg["role"] == "user" and msg == messages[-1]:
                oai_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": image_url}},
                            {"type": "text", "text": msg["content"]},
                        ],
                    }
                )
            else:
                oai_messages.append(msg)

        response = await client.chat.completions.create(
            model=model or "gpt-4o",
            messages=oai_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content


# Singleton
llm_client = LLMClient()

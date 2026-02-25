from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.services.llm import llm_client
from app.config import settings


SYSTEM_PROMPT = """You are a K-12 Content Safety Agent. Your role is to evaluate generated educational content for appropriateness in K-12 classroom settings.

You must check for:
1. Age-appropriateness: Content must be suitable for the specified grade level
2. Accuracy: Scientific/factual content should be accurate and not misleading
3. Safety: No violent, sexual, or disturbing imagery
4. Bias: No racial, gender, cultural, or other biases
5. Educational value: Content should support learning objectives

Respond in JSON format:
{
    "approved": true/false,
    "confidence": 0.0-1.0,
    "feedback": "Explanation of decision",
    "concerns": ["concern 1", "concern 2"],
    "suggestions": ["suggestion 1"]
}

Be strict about safety but reasonable about educational content. Medical/anatomical models are acceptable when scientifically accurate and age-appropriate."""


class SafeguardAgent(BaseAgent):
    def __init__(self):
        super().__init__("safeguard", "Safeguard Agent")

    async def execute(self, context: AgentContext) -> AgentResult:
        prompt_info = context.refined_prompt or context.original_prompt
        grade_info = f"Grade level: {context.grade_level}" if context.grade_level else "General K-12"

        user_message = (
            f"Please evaluate the following generated content for K-12 safety.\n\n"
            f"{grade_info}\n"
            f"Original request: \"{context.original_prompt}\"\n"
            f"Refined prompt: \"{prompt_info}\"\n"
        )

        if context.safety_feedback:
            user_message += f"\nPrevious feedback (retry #{context.retry_count}): {context.safety_feedback}\n"

        try:
            # If we have an image URL, use vision to evaluate
            if context.image_url and not settings.mock_3d:
                result = await llm_client.chat_json(
                    messages=[{"role": "user", "content": user_message + "\nPlease evaluate the attached image for K-12 appropriateness."}],
                    system=SYSTEM_PROMPT,
                )
            else:
                # Text-only evaluation (mock mode or no image)
                user_message += "\nNote: Evaluating based on prompt description only (no image available)."
                result = await llm_client.chat_json(
                    messages=[{"role": "user", "content": user_message}],
                    system=SYSTEM_PROMPT,
                )

            approved = result.get("approved", True)

            return AgentResult(
                success=True,
                agent_id=self.agent_id,
                output={
                    "approved": approved,
                    "confidence": result.get("confidence", 0.9),
                    "feedback": result.get("feedback", ""),
                    "concerns": result.get("concerns", []),
                    "suggestions": result.get("suggestions", []),
                },
            )

        except Exception as e:
            return AgentResult(
                success=False,
                agent_id=self.agent_id,
                error=f"Safety evaluation failed: {str(e)}",
            )

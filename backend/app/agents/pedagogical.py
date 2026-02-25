from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.services.llm import llm_client


SYSTEM_PROMPT = """You are a K-12 Pedagogical Expert Agent. Your role is to transform simple teacher prompts into detailed, curriculum-aligned prompts for 3D content generation.

Given a teacher's natural language request, you must:
1. Identify the core educational concept
2. Determine the appropriate detail level for the grade level
3. Generate a refined, detailed prompt optimized for 3D model generation

Your refined prompt should specify:
- Scientific/factual accuracy requirements
- Key visual features and structures that must be present
- Appropriate complexity for the target grade level
- Real-time rendering optimization notes
- Educational labeling requirements

Respond in JSON format:
{
    "refined_prompt": "The detailed prompt for 3D generation...",
    "learning_objectives": ["objective 1", "objective 2"],
    "key_features": ["feature 1", "feature 2"],
    "subject_area": "science|arts|history|math|literature|other",
    "complexity_level": "elementary|middle|high"
}"""


class PedagogicalAgent(BaseAgent):
    def __init__(self):
        super().__init__("pedagogical", "Pedagogical Agent")

    async def execute(self, context: AgentContext) -> AgentResult:
        grade_info = f" for grade level: {context.grade_level}" if context.grade_level else ""
        subject_info = f" in subject: {context.subject}" if context.subject else ""

        user_message = (
            f"Teacher's request: \"{context.original_prompt}\"{grade_info}{subject_info}\n\n"
            "Please refine this into a detailed, curriculum-aligned prompt for 3D content generation."
        )

        try:
            result = await llm_client.chat_json(
                messages=[{"role": "user", "content": user_message}],
                system=SYSTEM_PROMPT,
                temperature=0.5,
            )

            return AgentResult(
                success=True,
                agent_id=self.agent_id,
                output={
                    "refined_prompt": result.get("refined_prompt", context.original_prompt),
                    "learning_objectives": result.get("learning_objectives", []),
                    "key_features": result.get("key_features", []),
                    "subject_area": result.get("subject_area", "other"),
                    "complexity_level": result.get("complexity_level", "middle"),
                },
            )
        except Exception as e:
            return AgentResult(
                success=False,
                agent_id=self.agent_id,
                error=f"Failed to refine prompt: {str(e)}",
            )

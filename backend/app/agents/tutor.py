from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.services.llm import llm_client
from app.services.web_search import web_search_client


SYSTEM_PROMPT = """You are a K-12 Educational Tutor Agent. Your role is to create rich educational content that accompanies 3D models in an XR learning environment.

Given information about a 3D model and its subject matter, you must generate:
1. Educational annotations that can be placed on/near the 3D model
2. A structured lesson overview
3. Interactive quiz questions
4. Key vocabulary terms with definitions

Respond in JSON format:
{
    "annotations": [
        {
            "id": "ann_1",
            "label": "Short label",
            "description": "Detailed educational description",
            "position_hint": "top|bottom|left|right|center"
        }
    ],
    "educational_content": {
        "title": "Lesson title",
        "overview": "Brief lesson overview paragraph",
        "key_facts": ["fact 1", "fact 2", "fact 3"],
        "vocabulary": [
            {"term": "word", "definition": "meaning"}
        ],
        "quiz_questions": [
            {
                "question": "Question text?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": 0,
                "explanation": "Why this is correct"
            }
        ],
        "fun_facts": ["fun fact 1", "fun fact 2"],
        "further_reading": ["topic 1", "topic 2"]
    }
}

Make content age-appropriate, engaging, and scientifically accurate. Use clear, simple language for younger grades and more technical terms for higher grades."""


class TutorAgent(BaseAgent):
    def __init__(self):
        super().__init__("tutor", "Tutor Agent")

    async def execute(self, context: AgentContext) -> AgentResult:
        # First, do web research to gather accurate information
        research_context = ""
        try:
            search_query = context.refined_prompt or context.original_prompt
            search_results = await web_search_client.search(
                f"educational {search_query} K-12 lesson"
            )
            if search_results:
                research_context = "\n\nResearch findings:\n" + "\n".join(
                    f"- {r}" for r in search_results[:5]
                )
        except Exception:
            research_context = "\n\n(Web research unavailable, using built-in knowledge)"

        grade_info = f"Grade level: {context.grade_level}" if context.grade_level else "General K-12"
        subject_info = f"Subject: {context.subject}" if context.subject else ""

        user_message = (
            f"Create educational content for the following 3D model:\n\n"
            f"{grade_info}\n"
            f"{subject_info}\n"
            f"Original request: \"{context.original_prompt}\"\n"
            f"Detailed description: \"{context.refined_prompt or context.original_prompt}\"\n"
            f"{research_context}\n\n"
            f"Generate comprehensive educational annotations and lesson content."
        )

        try:
            result = await llm_client.chat_json(
                messages=[{"role": "user", "content": user_message}],
                system=SYSTEM_PROMPT,
                temperature=0.6,
                max_tokens=4096,
            )

            return AgentResult(
                success=True,
                agent_id=self.agent_id,
                output={
                    "annotations": result.get("annotations", []),
                    "educational_content": result.get("educational_content", {}),
                },
            )

        except Exception as e:
            return AgentResult(
                success=False,
                agent_id=self.agent_id,
                error=f"Educational content generation failed: {str(e)}",
            )

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # LLM Configuration
    llm_provider: str = "claude"  # "claude" | "openai"
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    # 3D Generation
    mock_3d: bool = True
    meshy_api_key: Optional[str] = None

    # Web Search (Tutor agent)
    tavily_api_key: Optional[str] = None

    # CORS
    allowed_origins: str = "http://localhost:3000"

    # General
    env: str = "development"

    # Agent settings
    max_safety_retries: int = 3
    agent_timeout_seconds: int = 300

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()

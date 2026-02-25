from datetime import datetime, timezone
from typing import Any, Optional


class SessionStore:
    """In-memory session store. Data is lost on restart."""

    def __init__(self):
        self._sessions: dict[str, dict] = {}

    def create_session(
        self,
        session_id: str,
        prompt: str,
        run_id: str,
        grade_level: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> dict:
        session = {
            "id": session_id,
            "prompt": prompt,
            "run_id": run_id,
            "grade_level": grade_level,
            "subject": subject,
            "status": "running",
            "refined_prompt": None,
            "image_url": None,
            "model_url": None,
            "annotations": [],
            "educational_content": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[dict]:
        return self._sessions.get(session_id)

    def update_session(self, session_id: str, **kwargs) -> Optional[dict]:
        session = self._sessions.get(session_id)
        if session is None:
            return None
        for key, value in kwargs.items():
            if key in session:
                session[key] = value
        session["updated_at"] = datetime.now(timezone.utc).isoformat()
        return session

    def list_sessions(self) -> list[dict]:
        return sorted(
            self._sessions.values(),
            key=lambda s: s["created_at"],
            reverse=True,
        )

    def delete_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False


# Singleton
session_store = SessionStore()

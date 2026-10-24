"""
Configuration management for NoteLoom V2.
Loads settings from environment variables and provides sensible defaults.
"""

import os
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load .env file from project root or backend directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")


class AppConfig(BaseModel):
    # API Keys
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))

    # Gemini Models (gemini-2.5-flash has full structured JSON support and generous free-tier limits)
    extractor_model: str = Field(default_factory=lambda: os.getenv("EXTRACTOR_MODEL", "gemini-2.5-flash"))
    interviewer_model: str = Field(default_factory=lambda: os.getenv("INTERVIEWER_MODEL", "gemini-2.5-flash"))
    writer_model: str = Field(default_factory=lambda: os.getenv("WRITER_MODEL", "gemini-2.5-flash"))
    critic_model: str = Field(default_factory=lambda: os.getenv("CRITIC_MODEL", "gemini-2.5-flash"))

    # Temperatures
    extractor_temperature: float = 0.2
    interviewer_temperature: float = 0.4
    writer_temperature: float = 0.3
    critic_temperature: float = 0.1

    # Paths
    root_dir: Path = ROOT_DIR
    vault_dir: Path = ROOT_DIR / os.getenv("DEFAULT_VAULT_PATH", "notes_vault")
    data_dir: Path = ROOT_DIR / "data"

    # Server settings
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))

    def ensure_directories(self):
        """Ensure necessary output and cache directories exist."""
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)


config = AppConfig()
config.ensure_directories()


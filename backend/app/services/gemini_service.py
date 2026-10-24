"""
Gemini Service for NoteLoom V2.
Wraps the official google-genai SDK for structured extraction and multi-agent reasoning.
"""

from typing import Type, TypeVar, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel
from backend.app.config import config

T = TypeVar("T", bound=BaseModel)


class GeminiService:
    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> genai.Client:
        """Initializes and returns the singleton genai.Client."""
        if cls._client is None:
            api_key = config.gemini_api_key
            if not api_key:
                raise ValueError(
                    "GEMINI_API_KEY is not set. Please add your Gemini API key to .env file."
                )
            cls._client = genai.Client(api_key=api_key)
        return cls._client

    @classmethod
    def generate_structured(
        cls,
        model: str,
        prompt: str,
        response_schema: Type[T],
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
    ) -> T:
        """
        Calls Gemini with structured JSON output enforcing a Pydantic schema.
        Automatically falls back to alternative models if a 429 quota limit is encountered.
        """
        client = cls.get_client()

        generate_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
            temperature=temperature,
        )
        if system_instruction:
            generate_config.system_instruction = system_instruction

        # Candidate models for automatic failover when hitting 429 rate limits
        models_to_try = [model]
        for fallback in ["gemini-2.5-flash-lite", "gemini-3-flash-preview", "gemini-2.5-flash"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        last_error = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=generate_config,
                )

                if response.parsed is not None:
                    return response.parsed

                # Fallback manual parsing if response.parsed was not populated
                import json
                raw_text = response.text or "{}"
                data = json.loads(raw_text)
                return response_schema.model_validate(data)

            except Exception as e:
                err_str = str(e)
                # If quota exhausted (429), try next model in the list
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    last_error = e
                    continue
                # For any other fatal error (e.g. invalid schema, bad prompt), re-raise immediately
                raise e

        if last_error:
            raise last_error


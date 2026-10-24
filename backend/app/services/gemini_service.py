"""
Gemini Service for NoteLoom V2.
Wraps the official google-genai SDK for structured extraction and multi-agent reasoning.
"""

import json
import time
import logging
from typing import Type, TypeVar, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel
from backend.app.config import config

logger = logging.getLogger(__name__)

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

    @staticmethod
    def is_transient_error(err_str: str) -> bool:
        """Checks if an error is a temporary Google server capacity or rate-limit spike."""
        err_upper = err_str.upper()
        transient_indicators = [
            "503",
            "UNAVAILABLE",
            "HIGH DEMAND",
            "429",
            "RESOURCE_EXHAUSTED",
            "RATE_LIMIT",
            "500",
            "INTERNAL",
            "504",
            "GATEWAY_TIMEOUT",
            "DEADLINE_EXCEEDED",
        ]
        return any(ind in err_upper for ind in transient_indicators)

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
        Automatically retries with exponential backoff on 503 / 429 errors
        and fails over to alternate models if a high-demand spike occurs.
        """
        client = cls.get_client()

        generate_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
            temperature=temperature,
        )
        if system_instruction:
            generate_config.system_instruction = system_instruction

        # Candidate models for automatic failover during Google spikes or rate limits
        models_to_try = [model]
        for fallback in ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-3-flash-preview"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        last_error = None

        for m in models_to_try:
            # Try each model up to 2 times with a backoff delay on temporary 503/429 spikes
            for attempt in range(1, 3):
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=generate_config,
                    )

                    if response.parsed is not None:
                        return response.parsed

                    # Fallback manual parsing if response.parsed was not populated
                    raw_text = response.text or "{}"
                    data = json.loads(raw_text)
                    return response_schema.model_validate(data)

                except Exception as e:
                    err_str = str(e)
                    last_error = e

                    if cls.is_transient_error(err_str):
                        logger.warning(
                            f"Model '{m}' encountered temporary spike (attempt {attempt}/2): {err_str[:120]}. "
                            f"Backing off before retrying or failing over..."
                        )
                        # Short pause to let Google server-side demand settle
                        time.sleep(2 * attempt)
                        continue
                    else:
                        # Non-transient fatal error (schema failure, bad input)
                        raise e

        if last_error:
            raise last_error


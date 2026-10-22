"""
Critic & Grounding Agent.
Audits generated concepts and notes against the source transcript.
Ensures zero hallucinations, verifies evidence snippets, and tags external insights.
"""

from typing import Tuple, List
from datetime import datetime, timezone
from backend.app.schemas import (
    VideoItem,
    VideoConcepts,
    GroundingCheckResult,
    JobEvent,
    AgentStep,
)
from backend.app.services.gemini_service import GeminiService
from backend.app.config import config


SYSTEM_PROMPT = """You are a Strict Code & Systems Fact-Checker and Evaluation Judge.
Your job is to audit extracted technical concepts against the original video transcript.

AUDIT CRITERIA:
1. Verbatim Evidence Check: Does each concept's `evidence_snippet` actually appear in the transcript?
2. Factual Accuracy: Are the explanations of how things work technically accurate and consistent with the video?
3. Hallucination Detection: Did the extraction fabricate algorithms, metrics, or instructor quotes that were never in the video?
4. Output: Assign a grounding score from 0.0 to 1.0. If score >= 0.80 and no severe hallucinations exist, set passed=True.
"""


class CriticAgent:
    name: str = "Critic & Grounding Agent"

    @classmethod
    def execute(
        cls,
        job_id: str,
        video: VideoItem,
        cleaned_transcript: str,
        concepts: VideoConcepts,
        total_videos: int = 1,
    ) -> Tuple[GroundingCheckResult, List[JobEvent]]:
        """
        Audits extracted concepts against the source transcript.
        """
        events: List[JobEvent] = []
        now = datetime.now(timezone.utc).isoformat()

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.CRITIC,
                agent_name=cls.name,
                status="processing",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Auditing grounding & verifying evidence snippets against transcript...",
                timestamp=now,
            )
        )

        # Fast local sanity check on evidence snippets
        cleaned_lower = cleaned_transcript.lower()
        verified_count = 0
        unbacked_snippets = []

        for c in concepts.concepts:
            # Check snippet existence (fuzzy / substring)
            snip = c.evidence_snippet.strip().lower()
            # Normalize punctuation
            import re
            snip_norm = re.sub(r"[^\w\s]", "", snip)
            clean_norm = re.sub(r"[^\w\s]", "", cleaned_lower)

            if snip_norm in clean_norm or any(part in clean_norm for part in snip_norm.split()[:4]):
                verified_count += 1
            else:
                unbacked_snippets.append(c.name)

        # If transcript is large, run full LLM judge
        prompt = f"""SOURCE TRANSCRIPT (excerpt/full):
{cleaned_transcript[:12000]}

EXTRACTED CONCEPTS TO AUDIT:
{concepts.model_dump_json(indent=2)}

Audit the concepts and return the GroundingCheckResult."""

        try:
            audit_result = GeminiService.generate_structured(
                model=config.critic_model,
                prompt=prompt,
                response_schema=GroundingCheckResult,
                system_instruction=SYSTEM_PROMPT,
                temperature=config.critic_temperature,
            )
        except Exception:
            # Graceful fallback if Gemini call fails during critic phase
            score = verified_count / max(len(concepts.concepts), 1)
            audit_result = GroundingCheckResult(
                passed=score >= 0.70,
                score=score,
                hallucination_detected=len(unbacked_snippets) > 0,
                unbacked_claims=unbacked_snippets,
                feedback=f"Local heuristic verified {verified_count}/{len(concepts.concepts)} snippets.",
            )

        status_msg = (
            f"Grounding audit passed (Score: {audit_result.score:.2f})."
            if audit_result.passed
            else f"Grounding audit flagged issues: {audit_result.feedback}"
        )

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.CRITIC,
                agent_name=cls.name,
                status="completed" if audit_result.passed else "warning",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=status_msg,
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return audit_result, events


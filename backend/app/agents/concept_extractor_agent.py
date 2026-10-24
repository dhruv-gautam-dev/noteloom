"""
Concept Extractor Agent.
Extracts grounded technical concepts, internal mechanisms, and verbatim evidence snippets.
"""

from typing import Tuple, List, Optional
from datetime import datetime, timezone
from backend.app.schemas import VideoItem, VideoConcepts, JobEvent, AgentStep
from backend.app.services.gemini_service import GeminiService
from backend.app.config import config


SYSTEM_PROMPT = """You are a Senior Computer Science Educator and Principal Systems Engineer.
Your goal is to extract the core technical concepts, deep-dive mechanisms, and algorithms taught in the provided video transcript.

STRICT EXTRACTION RULES:
1. Extract between 3 and 8 core concepts.
2. Ground every concept in the transcript: For every concept, provide a verbatim `evidence_snippet` (6 to 50 words) copied directly from the transcript without paraphrasing or ellipsis.
3. Language Handling: Regardless of the spoken language of the video (e.g., English, Hindi, Hinglish), formulate all concept explanations, mechanisms, why it matters, and trade-offs in crisp, professional English for software engineering interview preparation. Keep only the verbatim `evidence_snippet` in the original spoken transcript script/words.
4. Plain-English: In `one_line`, explain the concept simply without confusing jargon.
5. Mechanisms: In `how_it_works`, explain step-by-step how the data structure, algorithm, or system functions under the hood. Tag each step with `is_extra=False` if taught in the video, or `is_extra=True` if you added foundational context.
6. Instructor Example: If the speaker provided a concrete scenario, code example, or architecture walkthrough, record it in `instructor_example`. If none was given, leave it as null.
7. Honest Trade-offs: Note the real-world engineering trade-offs (e.g., latency vs. memory, consistency vs. availability).
"""


class ConceptExtractorAgent:
    name: str = "Concept Extractor Agent"

    @classmethod
    def execute(
        cls,
        job_id: str,
        video: VideoItem,
        cleaned_transcript: str,
        earlier_concepts: Optional[List[str]] = None,
        total_videos: int = 1,
    ) -> Tuple[VideoConcepts, List[JobEvent]]:
        """
        Extracts grounded technical concepts from the cleaned transcript.
        """
        events: List[JobEvent] = []
        now = datetime.now(timezone.utc).isoformat()

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.CONCEPTS,
                agent_name=cls.name,
                status="processing",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Extracting grounded technical concepts & evidence from '{video.title}'...",
                timestamp=now,
            )
        )

        prior_context = ""
        if earlier_concepts:
            prior_context = f"\nAlready covered concepts in this playlist: {', '.join(earlier_concepts)}. Cross-reference them if relevant.\n"

        prompt = f"""VIDEO METADATA:
- Title: {video.title}
- Day Number: {video.sequence_index}
- Channel: {video.channel or 'Unknown'}
{prior_context}

CLEANED TRANSCRIPT:
{cleaned_transcript}

Analyze the transcript and extract the core technical concepts adhering strictly to the schema."""

        concepts = GeminiService.generate_structured(
            model=config.extractor_model,
            prompt=prompt,
            response_schema=VideoConcepts,
            system_instruction=SYSTEM_PROMPT,
            temperature=config.extractor_temperature,
        )

        # Invariant safety: Ensure pipeline authority on video metadata
        concepts.video_id = video.video_id
        concepts.video_title = video.title
        concepts.day_number = video.sequence_index

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.CONCEPTS,
                agent_name=cls.name,
                status="completed",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Successfully extracted {len(concepts.concepts)} grounded concepts with verbatim evidence.",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return concepts, events


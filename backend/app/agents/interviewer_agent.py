"""
Staff Interviewer Agent.
Transforms extracted concepts into FAANG-caliber interview prep:
Q&A with rubrics, trade-off matrices, candidate red flags, cheat sheets, and flashcards.
"""

from typing import Tuple, List
from datetime import datetime, timezone
from backend.app.schemas import VideoItem, VideoConcepts, InterviewPrepPack, JobEvent, AgentStep
from backend.app.services.gemini_service import GeminiService
from backend.app.config import config


SYSTEM_PROMPT = """You are a Staff Software Engineer and Bar-Raiser Interviewer at a Tier-1 tech company (FAANG).
Your mission is to analyze technical concepts and turn them into an elite interview preparation pack.

INTERVIEW PACK REQUIREMENTS:
1. Language: Formulate all interview questions, rubrics, model answers, trade-off matrices, candidate red flags, cheat sheets, and flashcards in crisp, professional English for software engineering interviews.
2. Elevator Pitch: Write a crisp 60-second explanation that a candidate can say verbally to explain what this topic is, the core bottleneck it solves, and when to reach for it.
3. High-Yield Questions:
   - Provide questions spanning:
     - SCREENING (rapid conceptual check)
     - UNDER_THE_HOOD (internal mechanisms, memory layout, failure states, edge cases)
     - SYSTEM_DESIGN (architecture, scaling, real-world workload)
     - TRADEOFF (comparing this approach vs alternative standard approaches)
   - For every question:
     - Model Answer: High-signal, structured answer.
     - Interviewer Rubric: Specific concepts, keywords, or architecture choices the interviewer looks for.
     - Candidate Traps: Common mistakes or misconceptions that cause candidates to fail this question.
4. Trade-Off Matrix:
   - Exhaustive comparison rows: advantages, bottlenecks, best used when, avoid when.
5. Candidate Red Flags:
   - Top 3-5 wrong assumptions candidates make about this topic during technical rounds.
6. Cheat Sheet:
   - Compact facts, time/space complexities, formulas, or standard configuration parameters.
7. Spaced-Repetition Flashcards:
   - Single-fact Q&A pairs for active recall.
"""


class InterviewerAgent:
    name: str = "Staff Interviewer Agent"

    @classmethod
    def execute(
        cls,
        job_id: str,
        video: VideoItem,
        concepts: VideoConcepts,
        total_videos: int = 1,
    ) -> Tuple[InterviewPrepPack, List[JobEvent]]:
        """
        Generates comprehensive interview prep questions, trade-offs, and flashcards.
        """
        events: List[JobEvent] = []
        now = datetime.now(timezone.utc).isoformat()

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.INTERVIEW_PREP,
                agent_name=cls.name,
                status="processing",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Formulating FAANG interview questions, trade-off matrix & flashcards for '{video.title}'...",
                timestamp=now,
            )
        )

        concepts_summary = "\n".join(
            f"- {c.name}: {c.one_line}\n  Why it matters: {c.why_it_matters}\n  Trade-offs: {', '.join(c.trade_offs)}"
            for c in concepts.concepts
        )

        prompt = f"""VIDEO METADATA:
- Title: {video.title}
- Day Number: {video.sequence_index}
- Channel: {video.channel or 'Unknown'}

EXTRACTED TECHNICAL CONCEPTS:
{concepts_summary}

Generate the comprehensive InterviewPrepPack according to the schema."""

        prep_pack = GeminiService.generate_structured(
            model=config.interviewer_model,
            prompt=prompt,
            response_schema=InterviewPrepPack,
            system_instruction=SYSTEM_PROMPT,
            temperature=config.interviewer_temperature,
        )

        prep_pack.video_id = video.video_id

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.INTERVIEW_PREP,
                agent_name=cls.name,
                status="completed",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Formulated {len(prep_pack.questions)} interview questions, {len(prep_pack.trade_off_matrix)} trade-off rows, and {len(prep_pack.flashcards)} flashcards.",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return prep_pack, events


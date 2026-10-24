"""
Expert Technical Teacher & Note-Maker Agent.
Creates concise, high-yield, beginner-friendly study notes with analogies,
video examples, gotchas, interview questions, concept flow, and minimal code.
"""

from typing import Tuple, List, Optional
from datetime import datetime, timezone
from backend.app.schemas import VideoItem, StudyNote, JobEvent, AgentStep
from backend.app.services.gemini_service import GeminiService
from backend.app.config import config


SYSTEM_PROMPT = """You are an expert technical teacher and note-maker.
Your goal is to transform video transcripts into concise, high-quality, high-retention study notes for interview preparation and production system building.

## 0. EDUCATIONAL & TECHNICAL RELEVANCE GUARDRAIL (CRITICAL):
First, evaluate whether the video transcript is genuinely educational, technical, or practical tutorial material (e.g., Computer Science, System Design, Programming, AI/ML, Cloud, DevOps, Mathematics, Science, Engineering, Professional Tech Skills).
If the video is a MUSIC VIDEO, SONG LYRICS, MOVIE/TRAILER, COMEDY SKIT, OR NON-TECHNICAL ENTERTAINMENT:
- Set `is_educational: false`
- Set `rejection_reason: "This video contains entertainment/song lyrics and is not an educational or technical lecture."`
- Set `topic: "Non-Educational Content"`
- Set `summary: "Provide a clear 2-3 line summary explaining what this video actually is (e.g. This is an entertainment music video/song titled '...' by ..., featuring musical lyrics and emotional themes rather than technical coursework or coding instructions)."`
- Set `one_line_goal: "N/A"`
- Set `concepts: []` (LEAVE COMPLETELY EMPTY)
- NEVER fabricate, pretend, or hallucinate computer science or LLM concepts from song lyrics or non-educational content!

## CORE RULES (FOR EDUCATIONAL VIDEOS):
1. EXTRACT & MERGE: Do NOT reproduce line-by-line or follow the transcript order blindly. Merge overlapping concepts into 4 to 8 distinct, important concepts. No repeated interview questions across concepts.
2. IMPORTANCE FILTER: Include only IMPORTANT concepts: things that matter in an interview, in building a real production project, or easy to forget. Skip filler, intros, jokes, repetition, and administrative details.
3. SIMPLE LANGUAGE & STANDARD TERMINOLOGY: Write in simple language as if explaining to a beginner, but always include standard technical terminology (e.g., Thought/Action/Observation, Context Window, Tokenization, Embeddings, RAG).
4. ANALOGY FIRST: Provide a vivid real-life comparison BEFORE code or theory to make the intuition click immediately.
5. WHO DOES THE WORK & DATA FLOW: For EVERY concept, explicitly explain WHO does the work (the LLM, or my code?) and the exact flow of data between them (e.g. "My code sends prompt -> LLM returns text -> My code parses JSON").
6. COMPLETE MINIMAL WORKING CODE: If the video has code, provide a COMPLETE minimal working example including the main loop (not just isolated helper functions). Numbers and examples in the code must match the video's example exactly. Add a comment above each key line explaining WHY it is there.
7. PRODUCTION & SAFETY GOTCHAS: For every concept, include at least one critical safety or production gotcha (e.g. infinite loops, rate limits, prompt injections, cost spikes, latency bottlenecks).
8. STRICT (EXTRA) TAGGING: Mark every gotcha, interview question, or example that was NOT in the video as "(Extra)".
9. LENGTH & CONCISENESS: About 1 to 2 pages total (~100-120 lines), revisable in under 5 minutes. If it gets longer, cut out fluff.
10. LANGUAGE HANDLING: Even if the video is spoken in Hindi or Hinglish, formulate all definitions, analogies, gotchas, and interview questions in crisp, professional English.

## OUTPUT REQUIREMENTS:
- one_line_goal: "After this video I should be able to ___"
- prerequisites: Prerequisites or "None"
- concepts (4-8 concepts max):
  * definition: 1-2 lines in simple words
  * analogy: real-life comparison that makes it click immediately
  * who_does_work: Explain who does the work (the LLM, or my code?) and the exact flow of data between them.
  * video_example: the exact example the instructor used, shortened. Numbers and examples must match the video exactly.
  * why_it_matters: where it is used in real production projects
  * gotchas: common mistakes or misconceptions (mark as "(Extra)" if not covered in video)
  * production_safety_gotcha: one critical safety or production gotcha
  * interview_questions: 2-3 likely interview questions with short answers (mark not covered in the video as is_extra=True). No repeated questions across concepts.
- how_concepts_connect: Explain relationships between concepts (what depends on what, why X exists because of problem Y) followed by a simple flow: A → B → C
- code_snippets: Complete minimal working example with main loop, exact numbers, and WHY comments (or null if no code demonstrated).
- summary: 3-5 line summary in your own words.
- open_doubts: 2-3 topics worth looking up later.
- practice_task: One concrete practice task or mini project to apply this video immediately.
"""


class TeacherNoteAgent:
    name: str = "Expert Teacher & Note-Maker"

    @classmethod
    def execute(
        cls,
        job_id: str,
        video: VideoItem,
        cleaned_transcript: str,
        total_videos: int = 1,
    ) -> Tuple[StudyNote, List[JobEvent]]:
        """
        Executes unified teacher note generation in a single structured Gemini call.
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
                message=f"Extracting high-yield concepts, analogies & interview Q&As for '{video.title}'...",
                timestamp=now,
            )
        )

        prompt = f"""VIDEO METADATA:
- Title: {video.title}
- Day Number: {video.sequence_index}
- Channel: {video.channel or 'Unknown'}

TRANSCRIPT:
{cleaned_transcript[:25000]}

Create the concise, expert study note adhering strictly to the StudyNote schema."""

        study_note = GeminiService.generate_structured(
            model=config.extractor_model,
            prompt=prompt,
            response_schema=StudyNote,
            system_instruction=SYSTEM_PROMPT,
            temperature=config.extractor_temperature,
        )

        # Enforce pipeline authority
        study_note.video_id = video.video_id
        study_note.video_title = video.title
        study_note.day_number = video.sequence_index

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
                message=f"Generated {len(study_note.concepts)} core concepts with analogies & interview Q&As.",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return study_note, events


"""
NoteLoom V2 Pydantic Schemas.
Defines strict contracts between multi-agent pipeline stages.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


# ==========================================
# 1. Ingestion & Video Metadata Schemas
# ==========================================

class VideoItem(BaseModel):
    video_id: str
    title: str
    url: str
    duration_seconds: Optional[int] = None
    channel: Optional[str] = None
    sequence_index: int = 1  # 1-based order in playlist or 1 for single video
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None


class PlaylistInfo(BaseModel):
    playlist_id: str
    playlist_title: str
    total_videos: int
    videos: List[VideoItem]


class IngestionResult(BaseModel):
    is_playlist: bool
    playlist_id: Optional[str] = None
    playlist_title: Optional[str] = None
    videos: List[VideoItem]


# ==========================================
# 2. Transcript & Cleaning Schemas
# ==========================================

class TranscriptSnippet(BaseModel):
    text: str
    start: float
    duration: float


class TranscriptData(BaseModel):
    video_id: str
    video_title: str
    available: bool
    raw_text: str = ""
    cleaned_text: str = ""
    language: str = "en"
    word_count: int = 0
    fallback_reason: Optional[str] = None


# ==========================================
# 3. Expert Teacher & Study Note Schemas
# ==========================================

class ConceptInterviewQuestion(BaseModel):
    question: str
    answer: str
    is_extra: bool = Field(
        default=False,
        description="True if this interview question was NOT explicitly covered in the video"
    )


class TeacherConcept(BaseModel):
    name: str = Field(description="Name of the important technical concept")
    definition: str = Field(description="1-2 lines in simple words as if explaining to a beginner")
    analogy: str = Field(description="A real-life comparison that makes the concept click BEFORE code or theory")
    who_does_work: str = Field(
        description="Explain WHO does the work (the LLM, or my code?) and the exact flow of data between them"
    )
    video_example: str = Field(
        description="The exact example the instructor used, shortened. Numbers and details must match video exactly."
    )
    why_it_matters: str = Field(description="Where it is used in real production projects")
    gotchas: List[str] = Field(
        description="Common mistakes or confusions candidates make (mark (Extra) if not in video)"
    )
    production_safety_gotcha: str = Field(
        description="One critical safety or production gotcha (e.g. security, hallucination, infinite loop, cost blowup, latency)"
    )
    interview_questions: List[ConceptInterviewQuestion] = Field(
        description="2-3 likely interview questions with short answers (mark not covered as is_extra=True). No repeated questions across concepts."
    )


class StudyNote(BaseModel):
    video_id: str
    video_title: str
    day_number: int = 1
    is_educational: bool = Field(
        default=True,
        description="True if the video is an educational, technical, or practical tutorial/lecture. False if entertainment, music, song lyrics, movie scene, vlog, or non-educational content."
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        description="If is_educational is False, explain why this video cannot produce technical study notes."
    )
    topic: str = Field(default="", description="Specific technical topic, or 'Non-Educational Content' if rejected")
    one_line_goal: str = Field(default="", description="Action goal: 'After this video I should be able to ___'")
    prerequisites: str = Field(default="None", description="Prerequisites or 'None'")
    concepts: List[TeacherConcept] = Field(
        default_factory=list,
        description="4 to 8 important concepts max. If is_educational is False, leave this list empty [].",
    )
    how_concepts_connect: str = Field(
        default="",
        description="Explain relationships between concepts (what depends on what, why X exists because of problem Y) followed by a simple flow e.g. A → B → C"
    )
    code_snippets: Optional[str] = Field(
        default=None,
        description="A complete minimal working example, including the main loop, not just helper pieces. Numbers and examples in code must match the video exactly. Add a comment above each key line explaining WHY it is there. If no code was shown, leave as null."
    )
    summary: str = Field(default="", description="3-5 line summary of the whole video in plain words")
    open_doubts: List[str] = Field(default_factory=list, description="2-3 open doubts or topics worth looking up later")
    practice_task: str = Field(default="", description="One concrete practice task or mini project to apply this video")


# ==========================================
# Legacy Models (Preserved for compatibility)
# ==========================================

class TaggedText(BaseModel):
    text: str
    is_extra: bool = False


class InstructorExample(BaseModel):
    description: str
    evidence_snippet: Optional[str] = None


class Concept(BaseModel):
    name: str
    one_line: str
    why_it_matters: str
    how_it_works: List[TaggedText]
    evidence_snippet: str
    instructor_example: Optional[InstructorExample] = None
    trade_offs: List[str] = Field(default_factory=list)
    common_pitfalls: List[str] = Field(default_factory=list)
    already_covered_in: Optional[str] = None


class VideoConcepts(BaseModel):
    video_id: str
    video_title: str
    day_number: int
    concepts: List[Concept] = Field(min_length=1, max_length=10)


class QuestionLevel(str, Enum):
    SCREENING = "screening"
    UNDER_THE_HOOD = "under_the_hood"
    SYSTEM_DESIGN = "system_design"
    TRADEOFF = "trade_off"


class InterviewQuestion(BaseModel):
    level: QuestionLevel
    question: str
    model_answer: str
    interviewer_rubric: str
    candidate_traps: List[str] = Field(default_factory=list)


class TradeOffRow(BaseModel):
    technology_or_approach: str
    advantages: List[str]
    disadvantages_bottlenecks: List[str]
    best_used_when: str
    avoid_when: str


class FlashCard(BaseModel):
    front: str
    back: str
    tag: str = "interview-prep"
    is_extra: bool = False


class CheatSheetItem(BaseModel):
    topic: str
    quick_fact: str
    is_extra: bool = False


class InterviewPrepPack(BaseModel):
    video_id: str
    elevator_pitch: str
    questions: List[InterviewQuestion]
    trade_off_matrix: List[TradeOffRow]
    candidate_red_flags: List[str]
    cheat_sheet: List[CheatSheetItem]
    flashcards: List[FlashCard]


# ==========================================
# 4. Synthesis & Rendered Note Schemas
# ==========================================

class RenderedNote(BaseModel):
    video_id: str
    title: str
    day_number: int
    file_name: str
    relative_path: str
    markdown_content: str
    is_fallback: bool = False
    is_non_educational: bool = False


# ==========================================
# 5. Quality Critic Schemas
# ==========================================

class GroundingCheckResult(BaseModel):
    passed: bool
    score: float = Field(ge=0.0, le=1.0)
    hallucination_detected: bool = False
    unbacked_claims: List[str] = Field(default_factory=list)
    feedback: str = ""


# ==========================================
# 6. Job & Real-Time Event Streaming Schemas
# ==========================================

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentStep(str, Enum):
    INGESTION = "ingestion"
    TRANSCRIPT = "transcript"
    CLEANING = "cleaning"
    CONCEPTS = "concepts"
    INTERVIEW_PREP = "interview_prep"
    SYNTHESIS = "synthesis"
    CRITIC = "critic"
    MEMORY = "memory"
    DONE = "done"
    ERROR = "error"


class JobEvent(BaseModel):
    job_id: str
    step: AgentStep
    agent_name: str
    status: str
    message: str
    video_id: Optional[str] = None
    video_title: Optional[str] = None
    video_index: Optional[int] = None
    total_videos: Optional[int] = None
    timestamp: str

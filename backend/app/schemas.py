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
    fallback_reason: Optional[str] = None  # e.g., "Captions disabled or not available on YouTube"


# ==========================================
# 3. Concept Extractor Schemas (Grounded)
# ==========================================

class TaggedText(BaseModel):
    text: str
    is_extra: bool = False  # True if inferred/extended beyond transcript


class InstructorExample(BaseModel):
    description: str
    evidence_snippet: Optional[str] = None


class Concept(BaseModel):
    name: str = Field(description="Name of the technical concept, algorithm, or pattern")
    one_line: str = Field(description="Crisp 1-sentence plain English explanation")
    why_it_matters: str = Field(description="The concrete engineering problem or bottleneck it solves")
    how_it_works: List[TaggedText] = Field(description="Step-by-step internal mechanisms")
    evidence_snippet: str = Field(
        description="Verbatim 6-50 word quote directly from the transcript grounding this concept"
    )
    instructor_example: Optional[InstructorExample] = Field(
        default=None, description="The concrete example used in the video, or None if not demonstrated"
    )
    trade_offs: List[str] = Field(default_factory=list, description="Known trade-offs and constraints")
    common_pitfalls: List[str] = Field(default_factory=list, description="Common developer or interview mistakes")
    already_covered_in: Optional[str] = Field(
        default=None, description="Reference to earlier video if previously introduced"
    )


class VideoConcepts(BaseModel):
    video_id: str
    video_title: str
    day_number: int
    concepts: List[Concept] = Field(min_length=1, max_length=10)


# ==========================================
# 4. Staff Interviewer Schemas
# ==========================================

class QuestionLevel(str, Enum):
    SCREENING = "screening"          # Rapid conceptual check (30-60s answer)
    UNDER_THE_HOOD = "under_the_hood" # Internal mechanisms, failure modes, concurrency
    SYSTEM_DESIGN = "system_design"  # Architecture, scaling, real-world scenario
    TRADEOFF = "trade_off"           # Comparing X vs Y


class InterviewQuestion(BaseModel):
    level: QuestionLevel
    question: str
    model_answer: str
    interviewer_rubric: str = Field(
        description="Key points and signals a bar-raiser looks for in an optimal candidate answer"
    )
    candidate_traps: List[str] = Field(
        default_factory=list,
        description="Frequent mistakes or red flags average candidates make on this question"
    )


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
    quick_fact: str  # e.g., "B+ Tree: O(log N) search/insert, sequential leaf scans, disk-friendly"
    is_extra: bool = False


class InterviewPrepPack(BaseModel):
    video_id: str
    elevator_pitch: str = Field(
        description="Crisp 60-second summary answering: What is this topic and why does it matter?"
    )
    questions: List[InterviewQuestion]
    trade_off_matrix: List[TradeOffRow]
    candidate_red_flags: List[str]
    cheat_sheet: List[CheatSheetItem]
    flashcards: List[FlashCard]


# ==========================================
# 5. Synthesis & Rendered Note Schemas
# ==========================================

class RenderedNote(BaseModel):
    video_id: str
    title: str
    day_number: int
    file_name: str
    relative_path: str
    markdown_content: str
    is_fallback: bool = False


# ==========================================
# 6. Quality Critic Schemas
# ==========================================

class GroundingCheckResult(BaseModel):
    passed: bool
    score: float = Field(ge=0.0, le=1.0)
    hallucination_detected: bool = False
    unbacked_claims: List[str] = Field(default_factory=list)
    feedback: str = ""


# ==========================================
# 7. Job & Real-Time Event Streaming Schemas
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


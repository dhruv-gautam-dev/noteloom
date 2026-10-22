"""
Transcript & Cleaner Agent.
Extracts subtitles from YouTube, normalizes noise and stutter,
and safely routes to fallback when captions are unavailable.
"""

from typing import Tuple, List
from datetime import datetime, timezone
from backend.app.schemas import VideoItem, TranscriptData, JobEvent, AgentStep
from backend.app.services.youtube_service import YouTubeService


class TranscriptAgent:
    name: str = "Transcript & Cleaner Agent"

    @classmethod
    def execute(cls, job_id: str, video: VideoItem, total_videos: int = 1) -> Tuple[TranscriptData, List[JobEvent]]:
        """
        Executes transcript retrieval and cleaning.
        Returns:
            TranscriptData: The retrieved/cleaned transcript (or fallback flag).
            List[JobEvent]: Live progress events.
        """
        events: List[JobEvent] = []
        now = datetime.now(timezone.utc).isoformat()

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.TRANSCRIPT,
                agent_name=cls.name,
                status="processing",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Fetching subtitles for '{video.title}' (Day {video.sequence_index})...",
                timestamp=now,
            )
        )

        transcript = YouTubeService.fetch_transcript(video.video_id, video.title)

        if transcript.available:
            msg = f"Retrieved {transcript.word_count} words of cleaned transcript."
            status = "completed"
        else:
            msg = f"No transcript available: {transcript.fallback_reason}. Routing to Fallback Note Generator."
            status = "fallback_needed"

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.CLEANING if transcript.available else AgentStep.TRANSCRIPT,
                agent_name=cls.name,
                status=status,
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=msg,
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return transcript, events


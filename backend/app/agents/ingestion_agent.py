"""
Ingestion Agent.
Responsible for validating YouTube URLs, resolving playlist vs. single video hierarchies,
and extracting video metadata.
"""

from typing import Tuple, List
from datetime import datetime, timezone
from backend.app.schemas import IngestionResult, JobEvent, AgentStep
from backend.app.services.youtube_service import YouTubeService


class IngestionAgent:
    name: str = "Ingestion Scout Agent"

    @classmethod
    def execute(cls, job_id: str, url: str) -> Tuple[IngestionResult, List[JobEvent]]:
        """
        Executes URL parsing and metadata extraction.
        Returns:
            IngestionResult: The parsed playlist or video details.
            List[JobEvent]: Informational events for UI streaming.
        """
        events: List[JobEvent] = []
        now = datetime.now(timezone.utc).isoformat()

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.INGESTION,
                agent_name=cls.name,
                status="processing",
                message=f"Analyzing YouTube URL: {url}...",
                timestamp=now,
            )
        )

        result = YouTubeService.fetch_metadata(url)

        if result.is_playlist:
            msg = f"Detected playlist '{result.playlist_title}' with {len(result.videos)} videos."
        else:
            video = result.videos[0]
            msg = f"Detected single video: '{video.title}' (ID: {video.video_id})."

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.INGESTION,
                agent_name=cls.name,
                status="completed",
                total_videos=len(result.videos),
                message=msg,
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return result, events


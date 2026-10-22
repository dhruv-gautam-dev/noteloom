"""
Writer / Notes Architect Agent.
Assembles the complete Obsidian markdown study guide with callouts,
Mermaid diagrams, and spaced-repetition flashcards.
"""

from typing import Tuple, List
from datetime import datetime, timezone
from backend.app.schemas import VideoItem, VideoConcepts, InterviewPrepPack, RenderedNote, JobEvent, AgentStep
from backend.app.services.vault_service import VaultService


class WriterAgent:
    name: str = "Obsidian Notes Architect"

    @classmethod
    def execute(
        cls,
        job_id: str,
        video: VideoItem,
        concepts: VideoConcepts,
        prep: InterviewPrepPack,
        total_videos: int = 1,
    ) -> Tuple[RenderedNote, List[JobEvent]]:
        """
        Synthesizes concepts and interview pack into a formatted Obsidian study note.
        """
        events: List[JobEvent] = []
        now = datetime.now(timezone.utc).isoformat()

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.SYNTHESIS,
                agent_name=cls.name,
                status="processing",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Rendering Obsidian note with callouts, trade-offs & flashcards for '{video.title}'...",
                timestamp=now,
            )
        )

        rendered_note = VaultService.render_interview_note(
            video=video,
            concepts=concepts,
            prep=prep,
        )

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.SYNTHESIS,
                agent_name=cls.name,
                status="completed",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Successfully written to vault: '{rendered_note.file_name}'.",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return rendered_note, events


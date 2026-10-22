"""
Multi-Agent Orchestrator.
Coordinates the end-to-end execution of all 7 agents with streaming event dispatch.
"""

import asyncio
from typing import List, Callable, Optional, AsyncGenerator
from datetime import datetime, timezone

from backend.app.schemas import (
    VideoItem,
    IngestionResult,
    RenderedNote,
    JobEvent,
    AgentStep,
)
from backend.app.agents.ingestion_agent import IngestionAgent
from backend.app.agents.transcript_agent import TranscriptAgent
from backend.app.agents.concept_extractor_agent import ConceptExtractorAgent
from backend.app.agents.interviewer_agent import InterviewerAgent
from backend.app.agents.critic_agent import CriticAgent
from backend.app.agents.writer_agent import WriterAgent
from backend.app.agents.memory_agent import PlaylistMemoryAgent
from backend.app.services.vault_service import VaultService


class PipelineOrchestrator:
    @classmethod
    async def process_url(
        cls,
        job_id: str,
        url: str,
        event_callback: Optional[Callable[[JobEvent], None]] = None,
    ) -> List[RenderedNote]:
        """
        Executes the full multi-agent pipeline for a single video or playlist.
        Streams JobEvents to event_callback in real time.
        """
        def dispatch(event: JobEvent):
            if event_callback:
                event_callback(event)

        # ----------------------------------------------------
        # Stage 1: Ingestion Scout Agent
        # ----------------------------------------------------
        ingestion_result, ing_events = IngestionAgent.execute(job_id, url)
        for ev in ing_events:
            dispatch(ev)

        total_videos = len(ingestion_result.videos)
        playlist_title = ingestion_result.playlist_title or "Interview Prep Notes"
        rendered_notes: List[RenderedNote] = []
        cumulative_concepts: List[str] = []

        # ----------------------------------------------------
        # Stage 2 to 7: Per-Video Multi-Agent Execution Loop
        # ----------------------------------------------------
        for video in ingestion_result.videos:
            # Step 2: Transcript & Cleaner Agent
            transcript, tr_events = TranscriptAgent.execute(
                job_id=job_id, video=video, total_videos=total_videos
            )
            for ev in tr_events:
                dispatch(ev)

            # Fallback check
            if not transcript.available:
                # Captions are missing -> generate fallback note immediately
                fallback_note = VaultService.render_fallback_note(
                    video=video,
                    reason=transcript.fallback_reason or "Captions unavailable.",
                )
                rendered_notes.append(fallback_note)

                dispatch(
                    JobEvent(
                        job_id=job_id,
                        step=AgentStep.SYNTHESIS,
                        agent_name="Obsidian Notes Architect",
                        status="completed",
                        video_id=video.video_id,
                        video_title=video.title,
                        video_index=video.sequence_index,
                        total_videos=total_videos,
                        message=f"Generated fallback note in vault: '{fallback_note.file_name}'.",
                        timestamp=datetime.now(timezone.utc).isoformat(),
                    )
                )

                # Keep index updated
                PlaylistMemoryAgent.render_index_markdown(rendered_notes, playlist_title)
                continue

            # Step 3: Concept Extractor Agent (Grounded)
            concepts, conc_events = ConceptExtractorAgent.execute(
                job_id=job_id,
                video=video,
                cleaned_transcript=transcript.cleaned_text,
                earlier_concepts=cumulative_concepts,
                total_videos=total_videos,
            )
            for ev in conc_events:
                dispatch(ev)

            # Step 4: Staff Interviewer Agent
            prep_pack, prep_events = InterviewerAgent.execute(
                job_id=job_id,
                video=video,
                concepts=concepts,
                total_videos=total_videos,
            )
            for ev in prep_events:
                dispatch(ev)

            # Step 5: Critic & Grounding Agent
            audit, crit_events = CriticAgent.execute(
                job_id=job_id,
                video=video,
                cleaned_transcript=transcript.cleaned_text,
                concepts=concepts,
                total_videos=total_videos,
            )
            for ev in crit_events:
                dispatch(ev)

            # Step 6: Obsidian Writer Agent
            note, write_events = WriterAgent.execute(
                job_id=job_id,
                video=video,
                concepts=concepts,
                prep=prep_pack,
                total_videos=total_videos,
            )
            for ev in write_events:
                dispatch(ev)
            rendered_notes.append(note)

            # Step 7: Playlist Memory Agent
            updated_concepts, mem_events = PlaylistMemoryAgent.update_memory(
                job_id=job_id,
                video=video,
                concepts=concepts,
                all_notes=rendered_notes,
                playlist_title=playlist_title,
                total_videos=total_videos,
            )
            for ev in mem_events:
                dispatch(ev)
            cumulative_concepts = updated_concepts

        # Final Done Event
        dispatch(
            JobEvent(
                job_id=job_id,
                step=AgentStep.DONE,
                agent_name="Orchestrator",
                status="completed",
                total_videos=total_videos,
                message=f"Completed interview note generation for {len(rendered_notes)}/{total_videos} videos.",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return rendered_notes


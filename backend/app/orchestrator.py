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
from backend.app.agents.teacher_note_agent import TeacherNoteAgent
from backend.app.agents.memory_agent import PlaylistMemoryAgent
from backend.app.services.vault_service import VaultService
from backend.app.services.youtube_service import YouTubeService


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
        ingestion_result, ing_events = await asyncio.to_thread(IngestionAgent.execute, job_id, url)
        for ev in ing_events:
            dispatch(ev)
        await asyncio.sleep(0.01)

        total_videos = len(ingestion_result.videos)
        playlist_title = ingestion_result.playlist_title or "Interview Prep Notes"
        rendered_notes: List[RenderedNote] = []
        cumulative_concepts: List[str] = []

        # ----------------------------------------------------
        # Stage 2 to 7: Per-Video Multi-Agent Execution Loop
        # ----------------------------------------------------
        for video in ingestion_result.videos:
            # Step 1.5: Fast Educational Relevance Check (Heuristic)
            is_non_ed, non_ed_reason = YouTubeService.is_likely_non_educational(video)
            if is_non_ed:
                notice_note = await asyncio.to_thread(
                    VaultService.render_non_educational_note,
                    video=video,
                    reason=non_ed_reason,
                    category=video.category,
                )
                rendered_notes.append(notice_note)

                dispatch(
                    JobEvent(
                        job_id=job_id,
                        step=AgentStep.SYNTHESIS,
                        agent_name="Content Guardrail",
                        status="completed",
                        video_id=video.video_id,
                        video_title=video.title,
                        video_index=video.sequence_index,
                        total_videos=total_videos,
                        message=f"Created non-educational notice note: '{notice_note.file_name}' ({non_ed_reason}).",
                        timestamp=datetime.now(timezone.utc).isoformat(),
                    )
                )

                if total_videos > 1:
                    await asyncio.to_thread(PlaylistMemoryAgent.render_index_markdown, rendered_notes, playlist_title)
                await asyncio.sleep(0.01)
                continue

            # Step 2: Transcript & Cleaner Agent
            transcript, tr_events = await asyncio.to_thread(
                TranscriptAgent.execute, job_id=job_id, video=video, total_videos=total_videos
            )
            for ev in tr_events:
                dispatch(ev)
            await asyncio.sleep(0.01)

            # Step 3: Expert Teacher & Note-Maker Agent
            study_note = None
            try:
                study_note, teacher_events = await asyncio.to_thread(
                    TeacherNoteAgent.execute,
                    job_id=job_id,
                    video=video,
                    cleaned_transcript=transcript.cleaned_text if transcript.available else "",
                    total_videos=total_videos,
                )
                for ev in teacher_events:
                    dispatch(ev)
                await asyncio.sleep(0.01)
            except Exception as e:
                # If AI generation completely fails, fall back gracefully to outline note
                fallback_note = await asyncio.to_thread(
                    VaultService.render_fallback_note,
                    video=video,
                    reason=f"Study note generation failed: {str(e)}",
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
                await asyncio.to_thread(PlaylistMemoryAgent.render_index_markdown, rendered_notes, playlist_title)
                await asyncio.sleep(0.01)
                continue

            # Check LLM Educational Relevance Guardrail
            if not study_note.is_educational:
                rejection = study_note.rejection_reason or "Non-educational content"
                notice_note = await asyncio.to_thread(
                    VaultService.render_non_educational_note,
                    video=video,
                    reason=rejection,
                    video_summary=study_note.summary,
                    category=video.category,
                )
                rendered_notes.append(notice_note)

                dispatch(
                    JobEvent(
                        job_id=job_id,
                        step=AgentStep.SYNTHESIS,
                        agent_name="Content Guardrail",
                        status="completed",
                        video_id=video.video_id,
                        video_title=video.title,
                        video_index=video.sequence_index,
                        total_videos=total_videos,
                        message=f"Created non-educational notice note: '{notice_note.file_name}' ({rejection}).",
                        timestamp=datetime.now(timezone.utc).isoformat(),
                    )
                )

                if total_videos > 1:
                    await asyncio.to_thread(PlaylistMemoryAgent.render_index_markdown, rendered_notes, playlist_title)
                await asyncio.sleep(0.01)
                continue

            # Step 4: Render Study Note to Obsidian Vault
            rendered_note = await asyncio.to_thread(
                VaultService.render_teacher_study_note,
                video=video,
                note=study_note,
            )
            if not transcript.available:
                rendered_note.is_fallback = True

            rendered_notes.append(rendered_note)

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
                    message=f"Rendered concise study note in vault: '{rendered_note.file_name}'.",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
            )
            await asyncio.sleep(0.01)

            # Step 5: Playlist Memory Agent
            updated_concepts, mem_events = await asyncio.to_thread(
                PlaylistMemoryAgent.update_memory,
                job_id=job_id,
                video=video,
                concepts=study_note,
                all_notes=rendered_notes,
                playlist_title=playlist_title,
                total_videos=total_videos,
            )
            for ev in mem_events:
                dispatch(ev)
            cumulative_concepts = updated_concepts
            await asyncio.sleep(0.01)

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


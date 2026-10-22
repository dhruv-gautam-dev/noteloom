"""
Job Manager for NoteLoom V2.
Manages background job state and Event Queues for Server-Sent Events (SSE) streaming.
"""

import uuid
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, AsyncGenerator
from pydantic import BaseModel, Field

from backend.app.schemas import JobEvent, JobStatus, RenderedNote, AgentStep


class JobState(BaseModel):
    job_id: str
    url: str
    status: JobStatus = JobStatus.PENDING
    events: List[JobEvent] = Field(default_factory=list)
    notes: List[RenderedNote] = Field(default_factory=list)
    error_message: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class JobManager:
    _jobs: Dict[str, JobState] = {}
    _subscribers: Dict[str, List[asyncio.Queue]] = {}

    @classmethod
    def create_job(cls, url: str) -> JobState:
        """Creates and tracks a new processing job."""
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        state = JobState(job_id=job_id, url=url, status=JobStatus.PENDING)
        cls._jobs[job_id] = state
        cls._subscribers[job_id] = []
        return state

    @classmethod
    def get_job(cls, job_id: str) -> Optional[JobState]:
        return cls._jobs.get(job_id)

    @classmethod
    def list_jobs(cls) -> List[JobState]:
        return list(cls._jobs.values())

    @classmethod
    def dispatch_event(cls, job_id: str, event: JobEvent):
        """Records an event and broadcasts it to all active SSE subscribers."""
        job = cls.get_job(job_id)
        if job:
            job.events.append(event)
            if job.status == JobStatus.PENDING:
                job.status = JobStatus.PROCESSING

        # Broadcast to active SSE queues
        queues = cls._subscribers.get(job_id, [])
        for q in list(queues):
            try:
                q.put_nowait(event)
            except Exception:
                pass

    @classmethod
    def complete_job(cls, job_id: str, notes: List[RenderedNote]):
        job = cls.get_job(job_id)
        if job:
            job.status = JobStatus.COMPLETED
            job.notes = notes

    @classmethod
    def fail_job(cls, job_id: str, error: str):
        job = cls.get_job(job_id)
        if job:
            job.status = JobStatus.FAILED
            job.error_message = error

    @classmethod
    async def subscribe(cls, job_id: str) -> AsyncGenerator[str, None]:
        """
        Yields Server-Sent Events formatted strings:
        data: {"job_id": ..., "step": ..., ...}\n\n
        """
        job = cls.get_job(job_id)
        if not job:
            yield f"data: {{\"error\": \"Job '{job_id}' not found\"}}\n\n"
            return

        queue: asyncio.Queue = asyncio.Queue()
        if job_id not in cls._subscribers:
            cls._subscribers[job_id] = []
        cls._subscribers[job_id].append(queue)

        # 1. Immediately replay existing historical events to the newly connected subscriber
        for past_event in job.events:
            yield f"data: {past_event.model_dump_json()}\n\n"

        # If job is already finished, terminate stream
        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
            return

        # 2. Stream new events in real time
        try:
            while True:
                try:
                    event: JobEvent = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {event.model_dump_json()}\n\n"
                    if event.step in (AgentStep.DONE, AgentStep.ERROR):
                        break
                except asyncio.TimeoutError:
                    # Keep-alive SSE comment to prevent proxy timeouts
                    yield ": ping\n\n"
        finally:
            if job_id in cls._subscribers and queue in cls._subscribers[job_id]:
                cls._subscribers[job_id].remove(queue)


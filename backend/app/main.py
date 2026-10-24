"""
NoteLoom V2 FastAPI Application.
Provides REST and Server-Sent Events (SSE) endpoints for the React frontend.
"""

import io
import zipfile
import asyncio
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl

from backend.app.config import config
from backend.app.schemas import JobStatus, JobEvent, AgentStep
from backend.app.jobs import JobManager, JobState
from backend.app.orchestrator import PipelineOrchestrator
from backend.app.auth import get_current_user_optional, CurrentUser

app = FastAPI(
    title="NoteLoom V2 API",
    description="Multi-Agent YouTube to Obsidian Interview Prep System",
    version="2.0.0",
)

# Enable CORS for React frontend (Vite default: http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Request / Response Models
# ==========================================

class CreateJobRequest(BaseModel):
    url: str


class CreateJobResponse(BaseModel):
    job_id: str
    status: JobStatus
    url: str


class NoteSummary(BaseModel):
    filename: str
    stem: str
    is_index_or_glossary: bool = False
    size_bytes: int


# ==========================================
# Background Worker
# ==========================================

async def run_pipeline_worker(job_id: str, url: str):
    """Executes the pipeline in the background and updates JobManager."""
    try:
        def on_event(event: JobEvent):
            JobManager.dispatch_event(job_id, event)

        notes = await PipelineOrchestrator.process_url(
            job_id=job_id,
            url=url,
            event_callback=on_event,
        )
        JobManager.complete_job(job_id, notes)

    except Exception as e:
        error_msg = f"Pipeline execution failed: {str(e)}"
        JobManager.fail_job(job_id, error_msg)
        JobManager.dispatch_event(
            job_id,
            JobEvent(
                job_id=job_id,
                step=AgentStep.ERROR,
                agent_name="Orchestrator",
                status="failed",
                message=error_msg,
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
        )


# ==========================================
# Endpoints
# ==========================================

@app.get("/api/health")
def health_check():
    """Health check endpoint providing environment & configuration details."""
    has_gemini = bool(config.gemini_api_key)
    has_supabase = bool(config.supabase_url and config.supabase_anon_key)
    return {
        "status": "online",
        "version": "2.0.0",
        "gemini_configured": has_gemini,
        "supabase_configured": has_supabase,
        "models": {
            "extractor": config.extractor_model,
            "interviewer": config.interviewer_model,
            "writer": config.writer_model,
            "critic": config.critic_model,
        },
        "vault_dir": str(config.vault_dir),
    }


@app.get("/api/auth/me")
def get_auth_me(user: Optional[CurrentUser] = Depends(get_current_user_optional)):
    """Returns the authenticated user details, or guest status."""
    if not user:
        return {"authenticated": False, "user": None}
    return {
        "authenticated": True,
        "user": {
            "id": user.user_id,
            "email": user.email,
            "role": user.role,
        },
    }


@app.post("/api/jobs", response_model=CreateJobResponse)
async def create_job(payload: CreateJobRequest):
    """
    Spawns a new background job to process a YouTube video or playlist URL.
    Returns immediately with a job_id.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="YouTube URL is required")

    job = JobManager.create_job(url)
    asyncio.create_task(run_pipeline_worker(job.job_id, url))

    return CreateJobResponse(job_id=job.job_id, status=job.status, url=job.url)


@app.get("/api/jobs/latest")
def get_latest_job():
    """Returns the most recent job to restore UI state across page reloads."""
    job = JobManager.get_latest_job()
    if not job:
        return {"status": "none"}
    return job


@app.get("/api/jobs/{job_id}", response_model=JobState)
def get_job(job_id: str):
    """Retrieves current job status, accumulated events, and generated notes."""
    job = JobManager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


@app.get("/api/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Streams live JobEvent updates directly to the React frontend.
    """
    job = JobManager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    return StreamingResponse(
        JobManager.subscribe(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/notes", response_model=List[NoteSummary])
def list_notes():
    """Lists all notes currently residing in the Obsidian vault."""
    vault = config.vault_dir
    if not vault.exists():
        return []

    summaries = []
    for md_file in sorted(vault.glob("*.md")):
        is_meta = md_file.name in ("INDEX.md", "GLOSSARY.md")
        summaries.append(
            NoteSummary(
                filename=md_file.name,
                stem=md_file.stem,
                is_index_or_glossary=is_meta,
                size_bytes=md_file.stat().st_size,
            )
        )
    return summaries


@app.get("/api/notes/{filename}")
def get_note_content(filename: str):
    """Returns the raw Markdown content of a specific note for UI rendering."""
    vault = config.vault_dir
    file_path = vault / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Note '{filename}' not found in vault")

    try:
        content = file_path.read_text(encoding="utf-8")
        return {"filename": filename, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading note: {str(e)}")


@app.get("/api/download/vault")
def download_vault_zip():
    """Zips the entire Obsidian vault and streams it as a downloadable ZIP file."""
    vault = config.vault_dir
    if not vault.exists():
        raise HTTPException(status_code=404, detail="Vault directory does not exist")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file in vault.rglob("*"):
            if file.is_file():
                arcname = file.relative_to(vault)
                zip_file.write(file, arcname)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=noteloom_vault.zip"},
    )


@app.post("/api/vault/clear")
def clear_vault():
    """Clears all markdown files from the vault for a fresh start."""
    vault = config.vault_dir
    count = 0
    if vault.exists():
        for file in vault.glob("*.md"):
            try:
                file.unlink()
                count += 1
            except Exception:
                pass
    return {"status": "cleared", "deleted_count": count}


# NoteLoom V2: Project Status & Roadmap

> **Current Status:** 🟢 **Phase 4 Complete (FastAPI Server, Background Jobs & Real-Time SSE Stream Verified)**  
> **Next Step:** 🚀 **Phase 5 Implementation (React Frontend Web UI & Markdown Viewer)**

---

## 📍 Where Are We Right Now?

- [x] **Phase 1 (Architecture & Strategy):** System blueprint, 7-agent roster, interview templates, fallback specifications, and tech stack chosen.
- [x] **Phase 2 (Schemas, Ingestion & Fallback Engine):** Pydantic models, YouTube metadata extraction, caption cleaner, fallback note renderer, and test suite.
- [x] **Phase 3 (Multi-Agent Intelligence Core & Memory):** Gemini structured SDK integration, Concept Extractor, Staff Interviewer, Critic, Writer, and Playlist Memory agents.
- [x] **Phase 4 (FastAPI Server & Real-Time Streaming):**
  - [x] Created `backend/app/jobs.py`: `JobManager` for tracking asynchronous execution state and broadcasting events to multiple SSE subscriber queues with history replay and keep-alive pinging.
  - [x] Created `backend/app/main.py`: Full FastAPI application with CORS middleware.
  - [x] Implemented `POST /api/jobs` (starts async background pipeline and returns job ID).
  - [x] Implemented `GET /api/jobs/{id}/stream` (Server-Sent Events / SSE real-time streaming).
  - [x] Implemented `GET /api/jobs/{id}` (inspect job status and events).
  - [x] Implemented `GET /api/notes` & `GET /api/notes/{filename}` (vault inspection and raw note retrieval for frontend viewer).
  - [x] Implemented `GET /api/download/vault` (zips and streams entire Obsidian vault as a download).
  - [x] Added automated API tests (`backend/tests/test_phase4.py`) — **14/14 total unit and integration tests passing**.
  - [x] Added `docs/07_FASTAPI_BACKEND_GUIDE.md`.

---

## 🗺️ Project Milestones & Roadmap

```mermaid
flowchart LR
    P1["Phase 1:\nArchitecture & Strategy\n(Completed)"] --> P2["Phase 2:\nSchemas & Ingestion\n(Completed)"]
    P2 --> P3["Phase 3:\nMulti-Agent Brain\n(Completed)"]
    P3 --> P4["Phase 4:\nFastAPI Backend\n(Completed)"]
    P4 --> P5["Phase 5:\nReact Frontend\n(In Progress)"]
```

### Phase 1: Architecture & Knowledge Base (Done)
- [x] `docs/01_PROJECT_OVERVIEW.md` - Strategy, domains, and core problem.
- [x] `docs/02_MULTI_AGENT_ARCHITECTURE.md` - Agent specifications and lifecycle.
- [x] `docs/03_INTERVIEW_NOTE_TEMPLATE.md` - Full Obsidian template and fallback rules.
- [x] `docs/04_SYSTEM_WORKFLOW_AND_STACK.md` - API endpoints, streaming, and data flow.
- [x] `docs/05_BACKEND_WORKING_GUIDE.md` - Plain-language walkthrough of Phase 2 backend.
- [x] `docs/06_PHASE3_AGENTS_GUIDE.md` - Plain-language guide to Phase 3 agents & memory.
- [x] `docs/07_FASTAPI_BACKEND_GUIDE.md` - FastAPI server, SSE stream, and REST endpoints.
- [x] `docs/PROJECT_STATUS.md` - Live status log.

### Phase 2: Schemas & Ingestion Engine (Done)
- [x] Set up Python environment and `requirements.txt`.
- [x] Define Pydantic v2 schemas (`VideoItem`, `TranscriptData`, `VideoConcepts`, `InterviewPrepPack`, `RenderedNote`, `JobEvent`).
- [x] Implement **Ingestion Agent** (YouTube URL parser, playlist expansion).
- [x] Implement **Transcript & Cleaner Agent** (caption fetching with missing-caption fallback).
- [x] Implement **Vault Service** (generates Obsidian notes and fallback notes).
- [x] Add automated unit tests (`backend/tests/test_phase2.py`).

### Phase 3: Multi-Agent Intelligence Core (Done)
- [x] Implement `GeminiService` using `google-genai` SDK with structured outputs (`response_schema`).
- [x] Implement **Concept Extractor Agent** with strict transcript grounding & verbatim evidence.
- [x] Implement **Staff Interviewer Agent** (FAANG questions, trade-offs, candidate red flags).
- [x] Implement **Critic Agent** (grounding audit & hallucination checks).
- [x] Implement **Writer Agent** (renders structured interview notes + `#flashcards`).
- [x] Implement **Playlist Memory Agent** (cross-linking, `INDEX.md`, and cumulative `GLOSSARY.md`).
- [x] Implement **Pipeline Orchestrator** (asynchronous end-to-end multi-agent execution loop).
- [x] Automated integration testing (`backend/tests/test_phase3.py`).

### Phase 4: FastAPI Server & Real-Time Streaming (Done)
- [x] Build FastAPI server (`backend/app/main.py`) with asynchronous background task runner.
- [x] Implement Server-Sent Events (SSE) `/api/jobs/{id}/stream` for live agent step streaming.
- [x] Implement notes management endpoints (`GET /api/notes`, `GET /api/notes/{filename}`).
- [x] Implement vault ZIP export endpoint (`GET /api/download/vault`).
- [x] Automated API testing (`backend/tests/test_phase4.py`).

### Phase 5: React Web UI (Next)
- [ ] Scaffold Vite + React frontend in `frontend/`.
- [ ] Build YouTube URL submission & status dashboard.
- [ ] Build live agent pipeline visualization (stepper showing which agent is working in real time).
- [ ] Build Obsidian-like Markdown Viewer with syntax highlighting and flashcard mode.


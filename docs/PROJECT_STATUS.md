# NoteLoom V2: Project Status & Roadmap

> **Current Status:** 🟢 **Phase 1 Complete (System Architecture & Strategy Locked)**  
> **Next Step:** 🚀 **Phase 2 Implementation (Backend Core & Agent Schemas)**

---

## 📍 Where Are We Right Now?

We have finalized the system blueprint, requirements, and multi-agent roles:
- [x] Defined the multi-agent architecture and individual agent responsibilities.
- [x] Established interview-oriented note structures (60-sec elevator pitch, under the hood, trade-offs, candidate traps, mock Q&A, cheat sheet, flashcards).
- [x] Locked the fallback rule: generate an informative Obsidian note when transcripts are missing rather than failing silently.
- [x] Decided the technology stack:
  - **Backend:** FastAPI (Python 3.11+) + Pydantic v2 + Google GenAI (Gemini 2.5 Flash / Pro).
  - **Frontend:** React (Vite + Tailwind CSS).
  - **Output:** Obsidian-ready markdown vault with callouts, wikilinks, and `#flashcards`.
- [x] Initialized documentation repository inside `docs/`.

---

## 🗺️ Project Milestones & Roadmap

```mermaid
flowchart LR
    P1["Phase 1:\nArchitecture & Strategy\n(Completed)"] --> P2["Phase 2:\nSchemas & Ingestion\n(In Progress)"]
    P2 --> P3["Phase 3:\nMulti-Agent Brain\n(Concept + Interviewer + Writer)"]
    P3 --> P4["Phase 4:\nFastAPI Backend\n(Async Jobs + SSE Streaming)"]
    P4 --> P5["Phase 5:\nReact Frontend\n(Live UI + Note Viewer)"]
```

### Phase 1: Architecture & Knowledge Base (Done)
- [x] `docs/01_PROJECT_OVERVIEW.md` - Strategy, domains, and core problem.
- [x] `docs/02_MULTI_AGENT_ARCHITECTURE.md` - Agent specifications and lifecycle.
- [x] `docs/03_INTERVIEW_NOTE_TEMPLATE.md` - Full Obsidian template and fallback rules.
- [x] `docs/04_SYSTEM_WORKFLOW_AND_STACK.md` - API endpoints, streaming, and data flow.
- [x] `docs/PROJECT_STATUS.md` - This status log.

### Phase 2: Schemas & Ingestion Engine (Next)
- [ ] Set up Python environment and `requirements.txt`.
- [ ] Define Pydantic v2 schemas (`VideoMetadata`, `VideoConcepts`, `InterviewPrepPack`, `VideoNote`, `JobStatus`).
- [ ] Implement **Ingestion Agent** (YouTube URL parser, playlist expansion).
- [ ] Implement **Transcript & Cleaner Agent** (caption fetching with missing-caption fallback).

### Phase 3: Multi-Agent Intelligence Core
- [ ] Implement **Concept Extractor Agent** with strict transcript grounding.
- [ ] Implement **Staff Interviewer Agent** (FAANG questions, trade-offs, traps).
- [ ] Implement **Obsidian Notes Architect** (markdown rendering + flashcards).
- [ ] Implement **Critic Agent** (grounding check and `[EXTRA]` tagging).
- [ ] Implement **Playlist Memory** (cross-linking and cumulative `GLOSSARY.md`).

### Phase 4: FastAPI Server & Real-Time Streaming
- [ ] Build FastAPI server with asynchronous background workers.
- [ ] Implement Server-Sent Events (SSE) `/api/jobs/{id}/stream` for live agent updates.
- [ ] Implement notes management endpoints (`/api/notes`, `/api/download`).

### Phase 5: React Web UI
- [ ] Scaffold Vite + React + Tailwind frontend.
- [ ] Build YouTube URL submission & options form.
- [ ] Build live agent pipeline visualization (stepper showing which agent is working).
- [ ] Build Obsidian-like Markdown Viewer with syntax highlighting and flashcard mode.


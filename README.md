# NoteLoom V2: Multi-Agent YouTube Interview Prep System

NoteLoom V2 transforms any YouTube technical video or playlist into high-yield, interview-ready study notes, trade-off matrices, and active-recall flashcards tailored for cracking Software Engineering interviews.

---

## 📚 Project Documentation

All system documentation, architectural blueprints, and progress tracking are located in the [`docs/`](./docs/) directory:

- [**01. Project Overview & Strategy**](./docs/01_PROJECT_OVERVIEW.md) - The vision, covered domains (System Design, DSA, Backend, etc.), and principles.
- [**02. Multi-Agent Architecture**](./docs/02_MULTI_AGENT_ARCHITECTURE.md) - Breakdown of the 7 specialized AI agents and their inputs/outputs.
- [**03. Interview Note Template**](./docs/03_INTERVIEW_NOTE_TEMPLATE.md) - Obsidian-ready note layout (with callouts, flashcards) & fallback template.
- [**04. System Workflow & Stack**](./docs/04_SYSTEM_WORKFLOW_AND_STACK.md) - FastAPI backend, React web UI, Gemini API, and data flow.
- [**05. Backend Working Guide**](./docs/05_BACKEND_WORKING_GUIDE.md) - Detailed plain-language walkthrough of Phase 2 ingestion & fallback code.
- [**06. Phase 3 Agents Guide**](./docs/06_PHASE3_AGENTS_GUIDE.md) - Deep dive into the 7 multi-agent intelligence core, Gemini integration, and playlist memory.
- [**07. FastAPI Backend Guide**](./docs/07_FASTAPI_BACKEND_GUIDE.md) - Complete documentation of the FastAPI server, SSE streaming, and REST endpoints.
- [**08. React Frontend Guide**](./docs/08_REACT_FRONTEND_GUIDE.md) - Overview of the React UI, Live Agent Stepper, and interactive flashcards.
- [**Project Status & Roadmap**](./docs/PROJECT_STATUS.md) - Current status ("Where are we?") and upcoming milestones.

---

## 🛠️ Tech Stack
- **Backend:** FastAPI (Python 3.11+) + Pydantic v2
- **Frontend:** React + Tailwind CSS
- **LLM Engine:** Google Gemini (Gemini 2.5 Flash / Pro via `google-genai`)
- **Note Output:** Obsidian-ready markdown vault


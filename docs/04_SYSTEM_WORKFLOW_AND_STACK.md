# System Workflow & Technology Stack

This document details how the **FastAPI Backend**, the **Multi-Agent Pipeline**, and the **React Frontend** interact.

---

## 1. System Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | **FastAPI (Python 3.11+)** | High-performance asynchronous API, background task runner, and WebSocket/SSE streaming. |
| **LLM Engine** | **Google Gemini (`google-genai` SDK)** | Gemini 2.5 Flash (for high-speed cleaning & extraction) and Gemini 2.5 Pro (for deep interview reasoning). |
| **Data Validation** | **Pydantic v2** | Strict schema validation between agents to ensure deterministic structures. |
| **YouTube Extraction** | **`youtube-transcript-api`** | Direct caption extraction, with fallback detection. |
| **Frontend Framework** | **React (Vite + Tailwind CSS)** | Modern, responsive web user interface. |
| **Markdown Rendering** | **React-Markdown / Remark / Rehype** | Live rendering of Obsidian-style markdown, Mermaid diagrams, and callout blocks. |
| **Output Target** | **Obsidian Vault Directory** | Ready-to-use `.md` files equipped with YAML front matter, `#flashcards`, and `[[wikilinks]]`. |

---

## 2. End-to-End System Workflow

```
[ User in React Web UI ]
       │
       │ Enters: https://www.youtube.com/playlist?list=PL...
       ▼
POST /api/process (FastAPI)
       │
       ├─► 1. Launches Background Multi-Agent Job (Job ID generated)
       └─► 2. Returns Job ID immediately to React
       │
       ▼
React opens EventStream / WebSocket connection to:
GET /api/jobs/{job_id}/stream
       │
       │ (Real-time updates streamed to UI: Agent Status, Steps, Logs)
       ▼
Agent Execution Lifecycle:
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. Ingestion Agent fetches playlist items                   │
 │ 2. For each video:                                          │
 │    a. Transcript Agent attempts caption fetch              │
 │    b. If NOT available -> Generates fallback note           │
 │    c. If available -> Cleaner Agent sanitizes text          │
 │    d. Concept Extractor finds grounded mechanisms           │
 │    e. Interviewer Agent formulates FAANG Q&A & trade-offs   │
 │    f. Writer Agent renders Obsidian markdown note           │
 │    g. Critic Agent audits groundedness and tags [EXTRA]     │
 │    h. Playlist Memory updates GLOSSARY.md & INDEX.md        │
 └─────────────────────────────────────────────────────────────┘
       │
       ▼
[ Storage: notes_vault/ ]
       │ All markdown notes written to disk
       ▼
[ React Web UI ]
 Displays completion, renders interactive note preview, and provides:
 - "Open in Obsidian"
 - "Download Notes as ZIP"
 - "Flashcards Interactive Mode"
```

---

## 3. API Contract Overview

### `POST /api/jobs`
* **Request:**
  ```json
  {
    "url": "https://www.youtube.com/watch?v=...",
    "domain": "software-engineering",
    "vault_path": "notes_vault"
  }
  ```
* **Response:**
  ```json
  {
    "job_id": "job_984f2e1a",
    "status": "queued",
    "total_videos": 0
  }
  ```

### `GET /api/jobs/{job_id}/stream` (Server-Sent Events)
Streams real-time updates as agents work:
```json
{
  "step": "agent_concept_extraction",
  "video_id": "abc123xyz",
  "status": "processing",
  "agent": "Concept Extractor Agent",
  "message": "Extracting grounded mechanisms from transcript (14,200 words)..."
}
```

### `GET /api/notes/{job_id}`
Returns the list of generated notes with full markdown content for the React UI.


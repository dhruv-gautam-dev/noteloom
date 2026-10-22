# Backend Working Guide (Phase 2 Implementation)

> This document provides a plain-language, step-by-step explanation of how the backend code built in **Phase 2** works, what each file does, and how data moves through the system.

---

## 1. Directory Structure Built in Phase 2

```
backend/
├── app/
│   ├── schemas.py                 # Strictly-typed Pydantic contracts between all agents
│   ├── config.py                  # Environment variables, directory paths, and settings
│   ├── services/
│   │   ├── youtube_service.py     # URL parsing, YouTube metadata, transcript retrieval & cleaning
│   │   └── vault_service.py       # Obsidian note writer, callout builder, and fallback generator
│   └── agents/
│       ├── ingestion_agent.py     # Discovers videos, validates links, emits live status events
│       └── transcript_agent.py    # Fetches captions, strips noise, flags missing transcripts
└── tests/
    └── test_phase2.py             # Automated unit tests verifying URL parsing, cleaning, and fallback
```

---

## 2. File-by-File Breakdown: What Each File Does

### 🔹 `backend/app/schemas.py` (The Contracts)
In a multi-agent system, agents can break if they don't agree on data formats. This file defines **Pydantic v2 schemas** that enforce data rules:
- **`VideoItem`**: Stores clean metadata for a single video (`video_id`, `title`, `url`, `duration_seconds`, `channel`, `sequence_index`, `thumbnail_url`).
- **`IngestionResult`**: Returned by the Ingestion Agent. Signals whether the link was a single video or a playlist, and holds the list of `VideoItem`s.
- **`TranscriptData`**: Returned by the Transcript Agent. Contains the raw text, cleaned text, word count, and an `available: bool` flag with `fallback_reason` if captions were missing.
- **`JobEvent`**: The streaming event schema. Whenever an agent starts or finishes a step, it generates a `JobEvent` (e.g., `step="ingestion"`, `status="completed"`, `message="..."`) so the React frontend can display a real-time progress bar.
- **`RenderedNote`**: Holds the final Markdown content and destination file path in the Obsidian vault.

---

### 🔹 `backend/app/config.py` (Configuration Hub)
- Loads `.env` values (API keys, model choices).
- Sets sensible defaults (`gemini-2.5-flash` for extraction, `gemini-2.5-pro` for interview logic).
- Automatically ensures required directories exist on disk (`notes_vault/` and `data/`).

---

### 🔹 `backend/app/services/youtube_service.py` (The YouTube Engine)
This service handles all direct interactions with YouTube:
1. **`parse_url(url)`**: Extracts `video_id` and optional `playlist_id`. Supports full links (`youtube.com/watch?v=...`), playlist links (`list=...`), and short links (`youtu.be/...`).
2. **`fetch_metadata(url)`**: Uses `yt-dlp` in `extract_flat` mode.
   - *Why this is fast:* It only downloads lightweight JSON metadata (title, duration, channel) without downloading any video or audio files.
   - Accurately numbers playlist items from Day 1 to Day $N$.
3. **`fetch_transcript(video_id)`**:
   - Uses `youtube-transcript-api` to pull captions.
   - Prioritizes manual English transcripts, then auto-generated English, then any available language.
   - **Crucial Fallback Handling:** If captions are disabled or unavailable, it does **not** crash. It gracefully catches `TranscriptsDisabled` and `NoTranscriptFound` and returns `TranscriptData(available=False, fallback_reason="...")`.
4. **`clean_transcript_text(text)`**:
   - Strips sound markers: `[Music]`, `[Applause]`, `(cheering)`.
   - Normalizes whitespace.
   - Uses a rolling word deduplicator to eliminate auto-caption stutter (e.g., "this this is is" -> "this is").

---

### 🔹 `backend/app/services/vault_service.py` (The Obsidian Generator)
Turns structured data into beautiful, Obsidian-compatible `.md` files:
1. **`render_fallback_note(video, reason)`**:
   - When a video has no transcript, this function creates a formatted note with:
     - YAML front matter (`status: transcript_unavailable`, `tags: [interview-prep, manual-notes-needed]`).
     - A formatted Obsidian callout: `> [!WARNING] Transcript Not Available`.
     - Direct link, channel name, and duration.
     - A pre-formatted outline for manual notes, trade-offs, and `#flashcards`.
2. **`render_interview_note(video, concepts, prep)`**:
   - Renders complete interview notes with 60-second elevator pitches, deep-dive mechanisms with verbatim evidence, trade-off comparison tables, candidate trap callouts, and spaced-repetition `#flashcards`.
3. **`slugify(title)`**:
   - Converts titles into clean filenames, e.g. `01_distributed-consensus-with-raft.md`.

---

### 🔹 `backend/app/agents/ingestion_agent.py` & `transcript_agent.py`
These wrap the underlying services into agent workflows that generate event streams:
- When `IngestionAgent.execute(...)` is called, it emits a `processing` event, extracts the playlist or video list, and emits a `completed` event containing the total video count.
- When `TranscriptAgent.execute(...)` is called, it emits a `processing` event for the specific video. If captions are found, it emits `completed`; if missing, it emits `fallback_needed`.

---

## 3. Step-by-Step Data Flow: How It Works In Action

```
[ User provides YouTube Link ]
              │
              ▼
    1. IngestionAgent.execute(job_id, url)
       ├── Uses YouTubeService.parse_url()
       ├── Uses YouTubeService.fetch_metadata() (fast metadata-only)
       └── Returns: IngestionResult with List of VideoItems
              │
              ▼
    2. Loop over each VideoItem (Day 1..N):
       │
       ▼
    3. TranscriptAgent.execute(job_id, video)
       ├── Calls YouTubeService.fetch_transcript()
       │
       ├─► [Scenario A: Captions Found]
       │   ├── Cleans text (removes [Music], stutter)
       │   └── Returns TranscriptData(available=True, word_count=...)
       │       └── (Ready for Phase 3: Concept Extractor & Interviewer Agents)
       │
       └─► [Scenario B: Captions Unavailable]
           ├── Catches TranscriptsDisabled / NoTranscriptFound
           ├── Returns TranscriptData(available=False, fallback_reason=...)
           └── Calls VaultService.render_fallback_note()
               └── Instantly writes '01_video-title.md' with [!WARNING] callout
```

---

## 4. How the Code Was Tested & Verified

We built an automated test suite in [`backend/tests/test_phase2.py`](file:///c:/Users/dhruv/Dev/noteloomV2/backend/tests/test_phase2.py):
1. **URL Parsing Test:** Verified standard URLs, playlist URLs, and `youtu.be` links.
2. **Sanitization Test:** Confirmed `[Music]`, `[Applause]`, and stutter words are completely stripped.
3. **Fallback Note Test:** Confirmed that when a video has no transcript, an Obsidian note is written to disk with front matter and the `> [!WARNING]` callout.
4. **Agent Event Test:** Confirmed that `TranscriptAgent` emits the proper status events (`processing` -> `fallback_needed`).

All **4 tests pass cleanly** in `< 0.5s`.


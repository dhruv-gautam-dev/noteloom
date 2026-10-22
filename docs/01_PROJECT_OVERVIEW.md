# NoteLoom V2: Project Overview & Strategy

> **Mission:** Transform any YouTube technical video or playlist into high-yield, interview-ready study notes, trade-off matrices, and active-recall flashcards tailored for cracking Software Engineering interviews.

---

## 1. Why NoteLoom V2?

Generic AI summarizers produce vague bullet points that are useless for technical interviews. When preparing for top-tier Software Engineering roles (FAANG, high-growth startups, tier-1 tech firms), interviewers test for:
1. **Under-the-hood mechanics:** How do things actually work internally (memory, disk, network, concurrency)?
2. **Trade-offs & Comparisons:** Why choose Kafka over RabbitMQ? Why B-Trees over LSM-Trees? Latency vs. Throughput?
3. **Failure modes & edge cases:** What happens when a node crashes or a cache thunders? What are the common candidate red flags?
4. **Verbal explanation readiness:** Can you explain a complex concept crisply in 60 seconds?

**NoteLoom V2 is a specialized Multi-Agent System** that acts as your dedicated technical research team, transforming hours of YouTube lectures into structured, Obsidian-ready knowledge vaults.

---

## 2. Core Domains Covered (Software Engineering)

NoteLoom V2 is customized to recognize patterns, jargon, and interview expectations across:
- **System Design & Distributed Systems:** Scalability, replication, consensus, caching, CAP theorem, microservices.
- **Data Structures & Algorithms (DSA):** Time/Space complexity, edge cases, algorithmic patterns, data structure internals.
- **Backend & Database Engineering:** ACID, indexing, query optimization, connection pooling, transactions, isolation levels.
- **Low-Level Design & Concurrency:** Threads, locks, race conditions, memory models, object-oriented design patterns.
- **DevOps, Cloud & Infrastructure:** Containers, Kubernetes, CI/CD, observability, networking (TCP/UDP/gRPC).
- **Frontend & Web Systems:** Rendering cycles, browser performance, DOM manipulation, state management.

---

## 3. High-Level System Strategy

```
                                  [ User Input ]
                       YouTube Video URL or Playlist URL
                                        │
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         FASTAPI BACKEND ORCHESTRATOR                        │
 │                                                                             │
 │  1. Ingestion Agent       ──► Validates URL, extracts metadata & chapters    │
 │  2. Transcript Agent      ──► Captions API / Audio Fallback / Missing Notice│
 │  3. Cleaner Agent         ──► Normalizes timestamps, removes noise/stutter  │
 │  4. Concept Agent         ──► Verbatim evidence-grounded technical mechanics │
 │  5. Interviewer Agent     ──► Generates FAANG Q&A, trade-offs, pitfalls     │
 │  6. Writer Agent          ──► Builds Obsidian markdown note + flashcards    │
 │  7. Critic Agent          ──► Hallucination verification & fact checking    │
 │  8. Playlist Memory       ──► Evolving glossary, roadmap & cross-links      │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ (WebSocket / SSE stream)
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                             REACT WEB FRONTEND                              │
 │  - Real-time live status for each agent execution                           │
 │  - Interactive Obsidian-style Markdown Preview                              │
 │  - One-click copy, download, and vault export                               │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Behavioral Rules & Safeguards

1. **Transcript Fallback Rule:**
   - If a video has no transcript/captions, **do not crash or discard the video**.
   - Create a clean Obsidian note with the video title, thumbnail, channel, duration, and an explicit notice:
     `> [!WARNING] Transcript Not Available`
   - Provide a template ready for manual note-taking or future audio ingestion.
2. **Obsidian Compatibility:**
   - Use native Obsidian syntax: YAML front matter, Callout blocks (`> [!TIP]`, `> [!DANGER]`), `[[wikilinks]]`, and spaced-repetition flashcards (`Question :: Answer`).
3. **Groundedness & Anti-Hallucination:**
   - Concepts extracted directly from the video must be grounded with verbatim evidence snippets.
   - Any external interview questions, extra explanations, or deep-dive details are explicitly marked with `[EXTRA]` or `[INTERVIEW-DRILL]`.


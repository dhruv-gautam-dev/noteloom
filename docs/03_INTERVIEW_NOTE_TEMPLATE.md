# Concise Teacher & Interview Note Template

> **Revision Target:** 1–2 pages total (~100–120 lines), revisable in under 5 minutes.  
> **Philosophy:** Analogy BEFORE code/theory, 4–8 core concepts max, explicit attribution of who does the work, complete minimal working loop, interview Q&As paired directly with each concept, and honest `(Extra)` tagging.

---

## Core Rules & Guardrails
1. **Attribution & Flow:** For every technical concept, explain WHO does the work (the LLM, or my code?) and the exact flow of data between them.
2. **Analogy First:** Provide a vivid real-life comparison BEFORE code or theory to make intuition click immediately.
3. **Complete Minimal Working Code:** Include the main loop (not just helper snippets). Numbers and examples in code must match the video's example exactly, with a comment above each key line explaining WHY it is there.
4. **Production & Safety Gotchas:** Include at least one critical safety/production gotcha per concept (infinite loops, rate limits, security, cost spikes).
5. **Strict `(Extra)` Tagging:** Mark every gotcha, interview question, or example not explicitly in the video as `(Extra)`.
6. **Concept Flow & Merge:** Merge overlapping concepts (no repeated questions across concepts). Explain relationships and add a simple `A ➔ B ➔ C` flow.

---

## The Master Blueprint

```markdown
---
video_id: "<YOUTUBE_ID>"
video_title: "<TITLE>"
channel: "<CHANNEL_NAME>"
day_number: 1
topic: "<TOPIC>"
tags:
  - interview-prep
  - study-notes
created_at: 2026-10-24
source_url: "https://www.youtube.com/watch?v=<YOUTUBE_ID>"
---

# Day 01: <Title> - <Topic>

> **Goal:** After this video I should be able to <Action Goal>  
> **Prerequisites:** <Prerequisites or None>

---

## 💡 Important Concepts

### 1. <Concept Name>
- **Definition:** 1–2 lines, in simple words as if explaining to a beginner.
- **Analogy:** A real-life comparison that makes it click immediately before code or theory.
- **Who Does the Work & Data Flow:** Explain WHO does the work (the LLM, or my code?) and the exact flow of data between them.
- **Video's Example:** The exact example the instructor used, shortened (matching numbers/details).
- **Why It Matters:** Where this is used in real production projects.
- **Gotchas:**
  - Common mistake or confusion 1
  - Common mistake or confusion 2
  - 🚨 **Production/Safety Gotcha:** Critical production risk (e.g. rate limit exhaustion, prompt injection, infinite loop).
- **Interview Questions:**
  - **Q:** <Likely interview question>?
    - **A:** <Short, punchy model answer>
  - **Q `(Extra)`:** <Question extending beyond the video>?
    - **A:** <Short model answer>

---

## 🔗 How the Concepts Connect
Explain the relationships between concepts (what depends on what, and why X exists because of problem Y).
**Flow:** `Concept A` ➔ `Concept B` ➔ `Concept C`

---

## 💻 Minimal Code / Commands
```python
# Complete minimal working example matching the video's example and numbers
# WHY: Initialize client with production timeout to prevent hung sockets
client = GenAIClient(api_key=API_KEY)

# WHY: Main execution loop driving the prompt-response cycle
for step in range(max_steps):
    response = client.models.generate_content(...)
```

---

## 📌 Summary & Practice
- **Summary:** 3–5 line summary of the whole video in plain words.
- **Open Doubts / To Look Up:**
  - Topic 1 worth exploring deeper
  - Topic 2 worth exploring deeper
- **Apply It (Practice Task):** One hands-on task or mini-project to apply this video immediately.
```

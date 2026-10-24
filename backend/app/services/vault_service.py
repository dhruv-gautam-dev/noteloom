"""
Obsidian Vault Service.
Manages writing Obsidian-ready Markdown notes, formatting callouts,
generating fallback notes, and rendering index files.
"""

import re
from pathlib import Path
from datetime import datetime, timezone
from backend.app.schemas import (
    VideoItem,
    RenderedNote,
    VideoConcepts,
    InterviewPrepPack,
    StudyNote,
)
from backend.app.config import config


class VaultService:
    @staticmethod
    def slugify(text: str) -> str:
        """Converts titles into safe file slugs."""
        slug = re.sub(r"[^\w\s-]", "", text).strip().lower()
        return re.sub(r"[-\s]+", "-", slug)[:60]

    @classmethod
    def render_fallback_note(cls, video: VideoItem, reason: str, vault_path: Path = None) -> RenderedNote:
        """
        Renders an Obsidian fallback note when captions/transcripts are unavailable.
        Preserves the video's place in the curriculum and provides an outline for manual notes.
        """
        vault = vault_path or config.vault_dir
        vault.mkdir(parents=True, exist_ok=True)

        slug = cls.slugify(video.title)
        filename = f"{video.sequence_index:02d}_{slug}.md"
        filepath = vault / filename

        created_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        duration_str = (
            f"{video.duration_seconds // 60}:{video.duration_seconds % 60:02d}"
            if video.duration_seconds
            else "Unknown"
        )

        content = f"""---
video_id: "{video.video_id}"
video_title: "{video.title}"
channel: "{video.channel or 'Unknown'}"
day_number: {video.sequence_index}
status: "transcript_unavailable"
tags:
  - interview-prep
  - manual-notes-needed
created_at: {created_date}
source_url: "{video.url}"
---

# Day {video.sequence_index:02d}: {video.title}

> [!WARNING] Transcript Not Available
> Automatic captions and transcripts could not be retrieved from YouTube for this video.
> **Reason:** {reason}
>
> This note holds the video's place in the study sequence. Use the template below to add manual study notes or interview questions.

- **Video URL:** [{video.title}]({video.url})
- **Channel:** {video.channel or 'Unknown'}
- **Duration:** {duration_str}

---

## 📝 Manual Notes & Interview Highlights

### 🎯 Key Takeaways & Mechanisms
<!-- Add core concepts and how things work under the hood -->
- [ ] 

### ⚖️ Trade-offs & When to Use
<!-- Compare against alternatives -->
- [ ] 

### ❓ Interview Questions & Gotchas
<!-- Add questions interviewers might ask about this topic -->
- **Q:** 
  - **A:** 

### 📇 Flashcard Drafts (`#flashcards`)
<!-- Format: Question :: Answer -->
"""
        filepath.write_text(content, encoding="utf-8")

        try:
            rel_path = str(filepath.relative_to(config.root_dir))
        except ValueError:
            rel_path = str(filepath)

        return RenderedNote(
            video_id=video.video_id,
            title=video.title,
            day_number=video.sequence_index,
            file_name=filename,
            relative_path=rel_path,
            markdown_content=content,
            is_fallback=True,
        )

    @classmethod
    def render_interview_note(
        cls,
        video: VideoItem,
        concepts: VideoConcepts,
        prep: InterviewPrepPack,
        vault_path: Path = None,
    ) -> RenderedNote:
        """
        Renders a full interview preparation note adhering to docs/03_INTERVIEW_NOTE_TEMPLATE.md.
        """
        vault = vault_path or config.vault_dir
        vault.mkdir(parents=True, exist_ok=True)

        slug = cls.slugify(video.title)
        filename = f"{video.sequence_index:02d}_{slug}.md"
        filepath = vault / filename
        created_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Build Concepts Section
        concepts_md = []
        for i, c in enumerate(concepts.concepts, start=1):
            how_it_works_md = "\n".join(
                f"  {idx}. {item.text}{' `[EXTRA]`' if item.is_extra else ''}"
                for idx, item in enumerate(c.how_it_works, start=1)
            )
            ex_md = (
                f"- **Instructor's Example:** {c.instructor_example.description}"
                if c.instructor_example
                else "- **Instructor's Example:** *None demonstrated in video*"
            )

            concepts_md.append(
                f"""### {i}. {c.name}
- **In Plain English:** {c.one_line}
- **Why It Matters:** {c.why_it_matters}
- **How It Works Under the Hood:**
{how_it_works_md}
{ex_md}
- **Transcript Evidence Snippet:**
  > "{c.evidence_snippet}"
"""
            )
        concepts_block = "\n".join(concepts_md)

        # Build Trade-off Matrix
        tradeoff_rows = []
        for row in prep.trade_off_matrix:
            adv = "<br>• ".join([""] + row.advantages)
            dis = "<br>• ".join([""] + row.disadvantages_bottlenecks)
            tradeoff_rows.append(
                f"| **{row.technology_or_approach}** | {adv} | {dis} | {row.best_used_when} | {row.avoid_when} |"
            )
        tradeoff_block = "\n".join(tradeoff_rows) if tradeoff_rows else "| *N/A* | *See concepts above* | *N/A* | *N/A* | *N/A* |"

        # Build Candidate Traps
        traps_md = "\n".join(f"> - ⚠️ **Gotcha:** {trap}" for trap in prep.candidate_red_flags)

        # Build Interview Questions
        q_md = []
        for q in prep.questions:
            traps_sub = (
                "\n".join(f"    - *Trap to avoid:* {t}" for t in q.candidate_traps)
                if q.candidate_traps
                else ""
            )
            q_md.append(
                f"""#### [{q.level.value.upper()}] {q.question}
- **Model Answer:** {q.model_answer}
- **What Bar-Raiser Looks For:** {q.interviewer_rubric}
{traps_sub}
"""
            )
        questions_block = "\n".join(q_md)

        # Build Cheat Sheet
        cheat_md = "\n".join(
            f"- **{cs.topic}:** {cs.quick_fact}{' `[EXTRA]`' if cs.is_extra else ''}"
            for cs in prep.cheat_sheet
        )

        # Build Flashcards
        flash_md = "\n\n".join(
            f"{fc.front} #flashcards\n?\n{fc.back}{' `[EXTRA]`' if fc.is_extra else ''}"
            for fc in prep.flashcards
        )

        content = f"""---
video_id: "{video.video_id}"
video_title: "{video.title}"
channel: "{video.channel or 'Unknown'}"
day_number: {video.sequence_index}
tags:
  - interview-prep
  - software-engineering
created_at: {created_date}
source_url: "{video.url}"
---

# Day {video.sequence_index:02d}: {video.title}

> [!NOTE] 60-Second Elevator Pitch
> {prep.elevator_pitch}

---

## ⚙️ Core Technical Concepts & Deep Dives

{concepts_block}

---

## ⚖️ Trade-Off Matrix & Comparisons

| Technology / Approach | Key Advantages | Major Bottlenecks / Downsides | Best Used When... | Avoid When... |
| :--- | :--- | :--- | :--- | :--- |
{tradeoff_block}

---

## ⚠️ Common Candidate Traps & Red Flags
> [!DANGER] Common Interview Mistakes
{traps_md}

---

## 🎯 Mock Interview Question Bank

{questions_block}

---

## ⚡ Quick-Reference Cheat Sheet
{cheat_md}

---

## 📇 Spaced-Repetition Flashcards (`#flashcards`)

{flash_md}
"""
        filepath.write_text(content, encoding="utf-8")

        try:
            rel_path = str(filepath.relative_to(config.root_dir))
        except ValueError:
            rel_path = str(filepath)

        return RenderedNote(
            video_id=video.video_id,
            title=video.title,
            day_number=video.sequence_index,
            file_name=filename,
            relative_path=rel_path,
            markdown_content=content,
            is_fallback=False,
        )

    @classmethod
    def render_teacher_study_note(
        cls,
        video: VideoItem,
        note: StudyNote,
        vault_path: Path = None,
    ) -> RenderedNote:
        """
        Renders a concise, high-yield study note strictly adhering to the user's
        pedagogical blueprint (Definition, Analogy, Video Example, Gotchas, Interview Q&As, Flow, Footer).
        """
        vault = vault_path or config.vault_dir
        vault.mkdir(parents=True, exist_ok=True)

        slug = cls.slugify(video.title)
        filename = f"{video.sequence_index:02d}_{slug}.md"
        filepath = vault / filename
        created_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Build Concepts Block
        concepts_md = []
        for i, c in enumerate(note.concepts, start=1):
            gotchas_md = "\n".join(f"  - {g}" for g in c.gotchas) if c.gotchas else "  - None noted"
            
            prod_gotcha = getattr(c, "production_safety_gotcha", None)
            if prod_gotcha:
                gotchas_md += f"\n  - 🚨 **Production/Safety Gotcha:** {prod_gotcha}"

            who_work = getattr(c, "who_does_work", None)
            who_work_line = f"- **Who Does the Work & Data Flow:** {who_work}\n" if who_work else ""

            questions_md = []
            for q in c.interview_questions:
                extra_tag = " `(Extra)`" if q.is_extra else ""
                questions_md.append(f"  - **Q{extra_tag}:** {q.question}\n    - **A:** {q.answer}")
            q_block = "\n".join(questions_md) if questions_md else "  - None"

            concepts_md.append(
                f"""### {i}. {c.name}
- **Definition:** {c.definition}
- **Analogy:** {c.analogy}
{who_work_line}- **Video's Example:** {c.video_example}
- **Why It Matters:** {c.why_it_matters}
- **Gotchas:**
{gotchas_md}
- **Interview Questions:**
{q_block}
"""
            )
        concepts_block = "\n".join(concepts_md)

        # Build Code Block
        if note.code_snippets and note.code_snippets.strip():
            code_block = f"""```python\n{note.code_snippets.strip()}\n```"""
        else:
            code_block = "*No code or commands demonstrated in this video.*"

        # Build Doubts List
        doubts_md = "\n".join(f"- {d}" for d in note.open_doubts) if note.open_doubts else "- None"

        content = f"""---
video_id: "{video.video_id}"
video_title: "{video.title}"
channel: "{video.channel or 'Unknown'}"
day_number: {video.sequence_index}
topic: "{note.topic}"
tags:
  - interview-prep
  - study-notes
created_at: {created_date}
source_url: "{video.url}"
---

# Day {video.sequence_index:02d}: {note.video_title} - {note.topic}

> **Goal:** {note.one_line_goal}  
> **Prerequisites:** {note.prerequisites}

---

## 💡 Important Concepts

{concepts_block}

---

## 🔗 How the Concepts Connect
{note.how_concepts_connect}

---

## 💻 Minimal Code / Commands
{code_block}

---

## 📌 Summary & Practice
- **Summary:** {note.summary}
- **Open Doubts / To Look Up:**
{doubts_md}
- **Apply It (Practice Task):** {note.practice_task}
"""
        filepath.write_text(content, encoding="utf-8")

        try:
            rel_path = str(filepath.relative_to(config.root_dir))
        except ValueError:
            rel_path = str(filepath)

        return RenderedNote(
            video_id=video.video_id,
            title=video.title,
            day_number=video.sequence_index,
            file_name=filename,
            relative_path=rel_path,
            markdown_content=content,
            is_fallback=False,
        )

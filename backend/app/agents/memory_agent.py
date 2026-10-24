"""
Playlist Memory & Curriculum Agent.
Maintains persistent memory across videos, updates data/glossary.json,
and renders INDEX.md and GLOSSARY.md in the Obsidian vault.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime, timezone
from backend.app.schemas import VideoItem, VideoConcepts, JobEvent, AgentStep, RenderedNote, StudyNote
from backend.app.config import config


class PlaylistMemoryAgent:
    name: str = "Playlist Memory Coordinator"

    @classmethod
    def get_glossary_file(cls) -> Path:
        return config.data_dir / "glossary.json"

    @classmethod
    def load_glossary(cls) -> Dict[str, Any]:
        """Loads cumulative glossary from JSON."""
        file = cls.get_glossary_file()
        if file.exists():
            try:
                return json.loads(file.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {}

    @classmethod
    def save_glossary(cls, glossary: Dict[str, Any]):
        """Persists cumulative glossary to JSON."""
        config.data_dir.mkdir(parents=True, exist_ok=True)
        file = cls.get_glossary_file()
        file.write_text(json.dumps(glossary, indent=2), encoding="utf-8")

    @classmethod
    def update_memory(
        cls,
        job_id: str,
        video: VideoItem,
        concepts: Any,
        all_notes: List[RenderedNote],
        playlist_title: str = "Software Engineering Interview Curriculum",
        total_videos: int = 1,
    ) -> Tuple[List[str], List[JobEvent]]:
        """
        Updates cumulative glossary and re-renders INDEX.md and GLOSSARY.md in the vault.
        Accepts either StudyNote or VideoConcepts.
        """
        events: List[JobEvent] = []
        now = datetime.now(timezone.utc).isoformat()

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.MEMORY,
                agent_name=cls.name,
                status="processing",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Updating playlist memory, GLOSSARY.md, and INDEX.md...",
                timestamp=now,
            )
        )

        glossary = cls.load_glossary()

        for c in concepts.concepts:
            key = c.name.strip()
            one_line_desc = getattr(c, "definition", None) or getattr(c, "one_line", "")
            if key not in glossary:
                glossary[key] = {
                    "name": key,
                    "one_line": one_line_desc,
                    "first_video_id": video.video_id,
                    "first_video_title": video.title,
                    "day_number": video.sequence_index,
                    "referenced_in": [video.sequence_index],
                }
            else:
                if video.sequence_index not in glossary[key]["referenced_in"]:
                    glossary[key]["referenced_in"].append(video.sequence_index)

        cls.save_glossary(glossary)

        # Render GLOSSARY.md in Obsidian Vault
        cls.render_glossary_markdown(glossary)

        # Render INDEX.md in Obsidian Vault
        cls.render_index_markdown(all_notes, playlist_title)

        events.append(
            JobEvent(
                job_id=job_id,
                step=AgentStep.MEMORY,
                agent_name=cls.name,
                status="completed",
                video_id=video.video_id,
                video_title=video.title,
                video_index=video.sequence_index,
                total_videos=total_videos,
                message=f"Updated GLOSSARY.md ({len(glossary)} terms) and INDEX.md.",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )

        return list(glossary.keys()), events

    @classmethod
    def render_glossary_markdown(cls, glossary: Dict[str, Any]):
        """Renders alphabetical glossary markdown."""
        lines = [
            "# 📖 Technical Concept Glossary",
            "",
            "> Cumulative master index of all core engineering concepts covered in this curriculum.",
            "",
        ]

        sorted_keys = sorted(glossary.keys(), key=lambda s: s.lower())
        for key in sorted_keys:
            entry = glossary[key]
            day = entry.get("day_number", 1)
            refs = ", ".join(f"Day {r}" for r in entry.get("referenced_in", [day]))
            lines.append(f"### {entry['name']}")
            lines.append(f"- **Definition:** {entry['one_line']}")
            lines.append(f"- **Introduced In:** Day {day} ({entry['first_video_title']})")
            lines.append(f"- **Referenced In:** {refs}")
            lines.append("")

        filepath = config.vault_dir / "GLOSSARY.md"
        filepath.write_text("\n".join(lines), encoding="utf-8")

    @classmethod
    def render_index_markdown(cls, notes: List[RenderedNote], playlist_title: str):
        """Renders curriculum table of contents in the vault."""
        lines = [
            f"# 🎯 {playlist_title}",
            "",
            "> Master Roadmap and Index of all video notes in this interview preparation track.",
            "",
            "## 📋 Curriculum Table of Contents",
            "",
            "| Day | Note Link | Status |",
            "| :---: | :--- | :---: |",
        ]

        for note in sorted(notes, key=lambda n: n.day_number):
            if getattr(note, "is_non_educational", False):
                status_badge = "ℹ️ Non-Educational"
            elif note.is_fallback:
                status_badge = "⚠️ Transcript Missing"
            else:
                status_badge = "✅ Interview Ready"
            note_stem = Path(note.file_name).stem
            lines.append(f"| **Day {note.day_number:02d}** | [[{note_stem}]] | {status_badge} |")

        lines.extend([
            "",
            "---",
            "## 🔗 Master Resources",
            "- [[GLOSSARY|📖 Master Technical Glossary]]",
        ])

        filepath = config.vault_dir / "INDEX.md"
        filepath.write_text("\n".join(lines), encoding="utf-8")


"""
Unit and Integration tests for Phase 3:
Multi-agent intelligence, memory coordinator, critic, writer, and orchestrator.
"""

import asyncio
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from backend.app.schemas import (
    VideoItem,
    VideoConcepts,
    Concept,
    TaggedText,
    InstructorExample,
    InterviewPrepPack,
    InterviewQuestion,
    QuestionLevel,
    TradeOffRow,
    CheatSheetItem,
    FlashCard,
    RenderedNote,
    IngestionResult,
    TranscriptData,
    StudyNote,
    TeacherConcept,
    ConceptInterviewQuestion,
)
from backend.app.services.vault_service import VaultService
from backend.app.agents.writer_agent import WriterAgent
from backend.app.agents.memory_agent import PlaylistMemoryAgent
from backend.app.agents.critic_agent import CriticAgent
from backend.app.orchestrator import PipelineOrchestrator
from backend.app.config import config


@pytest.fixture
def sample_video():
    return VideoItem(
        video_id="raft_101",
        title="Raft Consensus Algorithm Explained",
        url="https://www.youtube.com/watch?v=raft_101",
        sequence_index=1,
        channel="Distributed Systems Club",
        duration_seconds=900,
    )


@pytest.fixture
def sample_concepts(sample_video):
    return VideoConcepts(
        video_id=sample_video.video_id,
        video_title=sample_video.title,
        day_number=1,
        concepts=[
            Concept(
                name="Leader Election in Raft",
                one_line="A mechanism where follower nodes vote to elect a single coordinator.",
                why_it_matters="Solves split-brain and ensures a single authority manages log entries.",
                how_it_works=[
                    TaggedText(text="Follower times out waiting for heartbeat.", is_extra=False),
                    TaggedText(text="Follower increments term and becomes candidate.", is_extra=False),
                    TaggedText(text="Requests votes from majority of cluster.", is_extra=False),
                ],
                evidence_snippet="when a follower does not receive a heartbeat within election timeout it transitions to candidate",
                instructor_example=InstructorExample(
                    description="A 5-node cluster where node 3 times out and asks for votes.",
                    evidence_snippet="in this five node cluster node three triggers an election",
                ),
                trade_offs=["Requires quorum (N/2 + 1), cannot operate if majority partitions"],
                common_pitfalls=["Setting election timeouts identical across all nodes causing split votes"],
            )
        ],
    )


@pytest.fixture
def sample_prep(sample_video):
    return InterviewPrepPack(
        video_id=sample_video.video_id,
        elevator_pitch="Raft is an understandable consensus algorithm that maintains an identical replicated log across nodes using leader election and quorum commits.",
        questions=[
            InterviewQuestion(
                level=QuestionLevel.UNDER_THE_HOOD,
                question="What prevents split votes in Raft during simultaneous timeouts?",
                model_answer="Raft uses randomized election timeouts (e.g. 150ms-300ms) so one node times out first and claims votes.",
                interviewer_rubric="Look for randomized timeouts, term numbers, and majority quorum.",
                candidate_traps=["Assuming nodes have synchronized hardware clocks."],
            )
        ],
        trade_off_matrix=[
            TradeOffRow(
                technology_or_approach="Raft Consensus",
                advantages=["Strong consistency", "Linearizable writes", "Automatic leader failover"],
                disadvantages_bottlenecks=["Write throughput bound by leader", "Requires odd-numbered quorum"],
                best_used_when="Metadata stores, distributed lock managers (etcd, Consul)",
                avoid_when="High-write throughput AP databases",
            )
        ],
        candidate_red_flags=["Confusing Paxos with Raft", "Ignoring network partitions"],
        cheat_sheet=[
            CheatSheetItem(topic="Quorum Formula", quick_fact="floor(N/2) + 1 nodes required")
        ],
        flashcards=[
            FlashCard(
                front="Why are Raft election timeouts randomized?",
                back="To prevent split votes when multiple nodes timeout simultaneously.",
            )
        ],
    )


def test_writer_agent_generates_markdown(sample_video, sample_concepts, sample_prep, tmp_path):
    with patch.object(config, "vault_dir", tmp_path):
        note, events = WriterAgent.execute(
            job_id="test_job",
            video=sample_video,
            concepts=sample_concepts,
            prep=sample_prep,
        )

        assert note.is_fallback is False
        assert note.day_number == 1
        assert "01_raft-consensus-algorithm-explained.md" in note.file_name

        # Check content
        assert "Leader Election in Raft" in note.markdown_content
        assert "60-Second Elevator Pitch" in note.markdown_content
        assert "Trade-Off Matrix" in note.markdown_content
        assert "#flashcards" in note.markdown_content
        assert (tmp_path / note.file_name).exists()


def test_playlist_memory_agent(sample_video, sample_concepts, tmp_path):
    with patch.object(config, "vault_dir", tmp_path), patch.object(config, "data_dir", tmp_path):
        notes = [
            RenderedNote(
                video_id=sample_video.video_id,
                title=sample_video.title,
                day_number=1,
                file_name="01_raft.md",
                relative_path="notes_vault/01_raft.md",
                markdown_content="# Day 1",
            )
        ]

        concept_names, events = PlaylistMemoryAgent.update_memory(
            job_id="test_job",
            video=sample_video,
            concepts=sample_concepts,
            all_notes=notes,
            playlist_title="Distributed Systems Masterclass",
        )

        assert "Leader Election in Raft" in concept_names

        # Check INDEX.md and GLOSSARY.md
        index_file = tmp_path / "INDEX.md"
        glossary_file = tmp_path / "GLOSSARY.md"
        assert index_file.exists()
        assert glossary_file.exists()

        index_content = index_file.read_text(encoding="utf-8")
        assert "Distributed Systems Masterclass" in index_content
        assert "[[01_raft]]" in index_content

        glossary_content = glossary_file.read_text(encoding="utf-8")
        assert "Leader Election in Raft" in glossary_content


def test_critic_agent_heuristic_check(sample_video, sample_concepts):
    transcript = "In this video we study Raft. When a follower does not receive a heartbeat within election timeout it transitions to candidate and requests votes."
    from backend.app.schemas import GroundingCheckResult
    with patch("backend.app.services.gemini_service.GeminiService.generate_structured") as mock_gen:
        mock_gen.return_value = GroundingCheckResult(
            passed=True,
            score=0.92,
            hallucination_detected=False,
            unbacked_claims=[],
            feedback="Evidence verified against transcript.",
        )
        result, events = CriticAgent.execute(
            job_id="test_job",
            video=sample_video,
            cleaned_transcript=transcript,
            concepts=sample_concepts,
        )

        assert result.passed is True
        assert result.score > 0.6


def test_orchestrator_handles_missing_transcript(sample_video, tmp_path):
    with patch.object(config, "vault_dir", tmp_path), patch.object(config, "data_dir", tmp_path):
        with patch("backend.app.services.youtube_service.YouTubeService.fetch_metadata") as mock_meta, \
             patch("backend.app.services.youtube_service.YouTubeService.fetch_transcript") as mock_trans:

            mock_meta.return_value = IngestionResult(
                is_playlist=False,
                videos=[sample_video],
            )
            mock_trans.return_value = TranscriptData(
                video_id=sample_video.video_id,
                video_title=sample_video.title,
                available=False,
                fallback_reason="Subtitles disabled on YouTube",
            )

            dispatched_events = []
            notes = asyncio.run(
                PipelineOrchestrator.process_url(
                    job_id="test_orchestrator",
                    url=sample_video.url,
                    event_callback=lambda ev: dispatched_events.append(ev),
                )
            )

            assert len(notes) == 1
            assert notes[0].is_fallback is True
            assert "01_raft-consensus-algorithm-explained.md" in notes[0].file_name

            # Verify that fallback note and INDEX.md were written
            assert (tmp_path / notes[0].file_name).exists()
            assert (tmp_path / "INDEX.md").exists()
            assert any(ev.step.value == "done" for ev in dispatched_events)


def test_render_teacher_study_note_with_attribution_and_production_gotcha(sample_video, tmp_path):
    study_note = StudyNote(
        video_id=sample_video.video_id,
        video_title=sample_video.title,
        day_number=1,
        topic="Consensus & Leader Election",
        one_line_goal="After this video I should be able to design a leader election protocol with quorum safety.",
        prerequisites="Basic networking and socket concepts",
        concepts=[
            TeacherConcept(
                name="Heartbeat Timeout Trigger",
                definition="A timer that resets every time a follower receives a ping from the active leader.",
                analogy="Like a security guard pressing a dead-man button every 5 minutes; if he stops, the alarm rings.",
                who_does_work="My code runs the timer thread and handles timeout callbacks; no LLM involved.",
                video_example="Nodes set election timeout between 150ms and 300ms to avoid split votes.",
                why_it_matters="Detects network partitions or leader crashes automatically in production clusters.",
                gotchas=[
                    "Using identical timeouts on all nodes causes persistent split votes.",
                    "Network jitter can trigger false-positive elections. (Extra)",
                ],
                production_safety_gotcha="Clock drift or CPU starvation can pause the timer thread, causing cascading elections.",
                interview_questions=[
                    ConceptInterviewQuestion(
                        question="Why are election timeouts randomized in Raft?",
                        answer="Randomization ensures one follower times out and starts collecting votes before others split the vote.",
                        is_extra=False,
                    ),
                    ConceptInterviewQuestion(
                        question="How do you handle split-brain in a network partition? (Extra)",
                        answer="A leader requires a quorum of (N/2 + 1) nodes to commit entries, preventing the partitioned minority from committing writes.",
                        is_extra=True,
                    ),
                ],
            )
        ],
        how_concepts_connect="Follower heartbeats fail ➔ Election timeout triggers ➔ Candidate requests majority votes ➔ New leader elected.\nFlow: Heartbeat Timeout ➔ Candidate State ➔ Quorum Vote ➔ Active Leader",
        code_snippets="# WHY: Check if leader heartbeat timed out\nif time.time() - last_heartbeat > timeout:\n    state = 'CANDIDATE'\n    start_election()",
        summary="Raft ensures high availability and consensus by electing a single leader via randomized timeouts and majority quorum votes.",
        open_doubts=[
            "How does Raft handle joint consensus during dynamic cluster membership changes?",
            "What is pre-vote protocol to prevent disrupted nodes from resetting terms?",
        ],
        practice_task="Implement a 3-node simulated cluster in Python with randomized election timeouts.",
    )

    rendered = VaultService.render_teacher_study_note(
        video=sample_video,
        note=study_note,
        vault_path=tmp_path,
    )

    assert rendered.file_name == "01_raft-consensus-algorithm-explained.md"
    assert (tmp_path / rendered.file_name).exists()

    md = rendered.markdown_content
    # Check Header
    assert "# Day 01: Raft Consensus Algorithm Explained - Consensus & Leader Election" in md
    assert "> **Goal:** After this video I should be able to design a leader election protocol" in md
    # Check Attribution & Production Gotcha
    assert "- **Who Does the Work & Data Flow:** My code runs the timer thread and handles timeout callbacks; no LLM involved." in md
    assert "- 🚨 **Production/Safety Gotcha:** Clock drift or CPU starvation can pause the timer thread, causing cascading elections." in md
    # Check Extra Tagging
    assert "`(Extra)`" in md
    # Check Minimal Code Snippet
    assert "```python" in md
    assert "# WHY: Check if leader heartbeat timed out" in md
    # Check Flow & Footer
    assert "## 🔗 How the Concepts Connect" in md
    assert "Flow: Heartbeat Timeout ➔ Candidate State ➔ Quorum Vote ➔ Active Leader" in md
    assert "- **Apply It (Practice Task):** Implement a 3-node simulated cluster" in md


def test_orchestrator_creates_notice_note_for_music_video(tmp_path):
    music_video = VideoItem(
        video_id="4mauxBeB9bA",
        title="Aashiq Banaya Aapne (Trending Version) 8K | Himesh Reshammiya,Shreya G",
        url="https://www.youtube.com/watch?v=4mauxBeB9bA",
        sequence_index=1,
        channel="T-Series",
        category="Music",
    )
    with patch.object(config, "vault_dir", tmp_path), patch.object(config, "data_dir", tmp_path):
        with patch("backend.app.services.youtube_service.YouTubeService.fetch_metadata") as mock_meta:
            mock_meta.return_value = IngestionResult(
                is_playlist=False,
                videos=[music_video],
            )
            notes = asyncio.run(
                PipelineOrchestrator.process_url(
                    job_id="test_music_job",
                    url=music_video.url,
                )
            )
            assert len(notes) == 1
            note = notes[0]
            assert note.is_non_educational is True
            assert (tmp_path / note.file_name).exists()
            assert "Aashiq Banaya Aapne" in note.markdown_content
            assert "Non-Educational Content Notice" in note.markdown_content
            assert "T-Series" in note.markdown_content
            assert "status: \"non_educational\"" in note.markdown_content
            assert "What Can NoteLoom Process?" in note.markdown_content


def test_orchestrator_creates_notice_note_when_agent_flags_non_educational(tmp_path):
    video = VideoItem(
        video_id="standup123",
        title="Standup Comedy Special Live in London",
        url="https://www.youtube.com/watch?v=standup123",
        sequence_index=1,
        channel="Comedy Hub",
        category="General",
    )
    mock_study_note = StudyNote(
        video_id="standup123",
        video_title="Standup Comedy Special Live in London",
        is_educational=False,
        rejection_reason="This video contains a comedy standup routine with jokes and crowd banter, not educational material.",
        summary="A comedy show performance featuring jokes and audience interaction.",
        concepts=[],
    )
    mock_transcript = TranscriptData(
        video_id="standup123",
        video_title="Standup Comedy Special Live in London",
        available=True,
        raw_text="hello london how are you doing tonight",
        cleaned_text="hello london how are you doing tonight",
    )

    with patch.object(config, "vault_dir", tmp_path), patch.object(config, "data_dir", tmp_path):
        with patch("backend.app.services.youtube_service.YouTubeService.fetch_metadata") as mock_meta, \
             patch("backend.app.agents.transcript_agent.TranscriptAgent.execute") as mock_tr, \
             patch("backend.app.agents.teacher_note_agent.TeacherNoteAgent.execute") as mock_teacher:
            mock_meta.return_value = IngestionResult(is_playlist=False, videos=[video])
            mock_tr.return_value = (mock_transcript, [])
            mock_teacher.return_value = (mock_study_note, [])

            notes = asyncio.run(
                PipelineOrchestrator.process_url(
                    job_id="test_comedy_job",
                    url=video.url,
                )
            )
            assert len(notes) == 1
            note = notes[0]
            assert note.is_non_educational is True
            assert (tmp_path / note.file_name).exists()
            assert "comedy standup routine" in note.markdown_content
            assert "A comedy show performance" in note.markdown_content





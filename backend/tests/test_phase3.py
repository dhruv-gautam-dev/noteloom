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
)
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

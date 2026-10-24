"""
Tests for Phase 2: Ingestion, Transcript cleaner, and Obsidian Vault Fallback.
"""

import pytest
from pathlib import Path
from backend.app.services.youtube_service import YouTubeService
from backend.app.services.vault_service import VaultService
from backend.app.schemas import VideoItem


def test_url_parsing():
    # Test standard watch URL
    v_id, p_id = YouTubeService.parse_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert v_id == "dQw4w9WgXcQ"
    assert p_id is None

    # Test playlist URL
    v_id, p_id = YouTubeService.parse_url("https://www.youtube.com/playlist?list=PL1234567890ABCDEF")
    assert v_id is None
    assert p_id == "PL1234567890ABCDEF"

    # Test video in playlist URL
    v_id, p_id = YouTubeService.parse_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890ABCDEF")
    assert v_id == "dQw4w9WgXcQ"
    assert p_id == "PL1234567890ABCDEF"

    # Test youtu.be short URL
    v_id, p_id = YouTubeService.parse_url("https://youtu.be/dQw4w9WgXcQ")
    assert v_id == "dQw4w9WgXcQ"


def test_non_youtube_url_rejected():
    with pytest.raises(ValueError) as exc:
        YouTubeService.fetch_metadata("https://missav.ws/en/fc2-ppv-4985073")
    assert "only supports YouTube" in str(exc.value)


def test_text_cleaning():
    raw = "[Music] Hello world (applause) this is is a distributed system test [Laughter]"
    cleaned = YouTubeService.clean_transcript_text(raw)
    assert "[Music]" not in cleaned
    assert "(applause)" not in cleaned
    assert "[Laughter]" not in cleaned
    # Note: "is is" should be deduped to single "is"
    assert "this is a distributed system test" in cleaned


def test_fallback_note_rendering(tmp_path: Path):
    video = VideoItem(
        video_id="TEST_NO_TRANSCRIPT",
        title="Distributed Consensus with Raft",
        url="https://www.youtube.com/watch?v=TEST_NO_TRANSCRIPT",
        sequence_index=1,
        channel="System Design School",
        duration_seconds=1240,
    )
    rendered = VaultService.render_fallback_note(
        video=video,
        reason="Captions are disabled by video owner.",
        vault_path=tmp_path,
    )

    assert rendered.is_fallback is True
    assert rendered.file_name == "01_distributed-consensus-with-raft.md"

    # Verify file was written
    note_file = tmp_path / rendered.file_name
    assert note_file.exists()

    content = note_file.read_text(encoding="utf-8")
    assert 'status: "transcript_unavailable"' in content
    assert "> [!WARNING] Transcript Not Available" in content
    assert "Captions are disabled by video owner." in content
    assert "Distributed Consensus with Raft" in content


def test_transcript_agent_fallback_event():
    from backend.app.agents.transcript_agent import TranscriptAgent
    from backend.app.schemas import AgentStep

    video = VideoItem(
        video_id="NON_EXISTENT_VIDEO_FOR_TEST_XYZ",
        title="Sample Video Without Captions",
        url="https://www.youtube.com/watch?v=NON_EXISTENT_VIDEO_FOR_TEST_XYZ",
        sequence_index=1,
    )

    transcript, events = TranscriptAgent.execute(job_id="test_job", video=video)
    assert transcript.available is False
    assert len(events) >= 2
    assert events[0].step == AgentStep.TRANSCRIPT
    assert events[1].status == "fallback_needed"


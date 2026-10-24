"""
Unit and API integration tests for Phase 4:
FastAPI endpoints, background jobs, SSE streaming, and vault file downloads.
"""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.config import config
from backend.app.jobs import JobManager
from backend.app.schemas import JobEvent, AgentStep

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["version"] == "2.0.0"
    assert "models" in data


def test_create_job_and_get_job():
    with patch("backend.app.main.run_pipeline_worker") as mock_worker:
        response = client.post("/api/jobs", json={"url": "https://www.youtube.com/watch?v=TEST_ABC"})
        assert response.status_code == 200
        data = response.json()
        job_id = data["job_id"]
        assert job_id.startswith("job_")
        assert data["url"] == "https://www.youtube.com/watch?v=TEST_ABC"

        # Check GET /api/jobs/{job_id}
        job_resp = client.get(f"/api/jobs/{job_id}")
        assert job_resp.status_code == 200
        job_data = job_resp.json()
        assert job_data["job_id"] == job_id


def test_create_job_empty_url():
    response = client.post("/api/jobs", json={"url": "   "})
    assert response.status_code == 400


def test_list_and_get_notes(tmp_path: Path):
    with patch.object(config, "vault_dir", tmp_path):
        # Create a sample note
        test_file = tmp_path / "01_test-note.md"
        test_file.write_text("# Test Note\nHello world", encoding="utf-8")

        # List notes
        response = client.get("/api/notes")
        assert response.status_code == 200
        notes = response.json()
        assert len(notes) == 1
        assert notes[0]["filename"] == "01_test-note.md"
        assert notes[0]["stem"] == "01_test-note"

        # Get specific note content
        content_resp = client.get("/api/notes/01_test-note.md")
        assert content_resp.status_code == 200
        assert "Hello world" in content_resp.json()["content"]

        # Missing note
        missing_resp = client.get("/api/notes/does_not_exist.md")
        assert missing_resp.status_code == 400 or missing_resp.status_code == 404


def test_download_vault_zip(tmp_path: Path):
    with patch.object(config, "vault_dir", tmp_path):
        test_file = tmp_path / "sample.md"
        test_file.write_text("Vault content", encoding="utf-8")

        response = client.get("/api/download/vault")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert "noteloom_vault.zip" in response.headers.get("content-disposition", "")


def test_sse_stream_dispatch():
    job = JobManager.create_job("https://www.youtube.com/watch?v=STREAM_TEST")
    job_id = job.job_id

    # Dispatch an event
    event = JobEvent(
        job_id=job_id,
        step=AgentStep.INGESTION,
        agent_name="Ingestion Scout",
        status="completed",
        message="Test event dispatched",
        timestamp="2026-10-23T04:00:00Z",
    )
    JobManager.dispatch_event(job_id, event)

    # Connect to stream
    with client.stream("GET", f"/api/jobs/{job_id}/stream") as response:
        for line in response.iter_lines():
            if line and line.startswith("data:"):
                assert "Test event dispatched" in line
                break


def test_auth_me_guest():
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert data["user"] is None


def test_auth_me_authenticated():
    import jwt
    secret = "a_very_secure_test_jwt_secret_key_123456789"
    token = jwt.encode(
        {"sub": "user_12345", "email": "test@example.com", "role": "authenticated", "aud": "authenticated"},
        secret,
        algorithm="HS256",
    )
    with patch.object(config, "supabase_jwt_secret", secret):
        response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["user"]["id"] == "user_12345"
        assert data["user"]["email"] == "test@example.com"
    assert data["user"]["email"] == "test@example.com"



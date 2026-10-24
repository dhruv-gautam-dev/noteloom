"""
Test Suite for NoteLoom V2 Phase 4:
Telemetry Ingestion, Role-Based Access Control (Admin), and Analytics Dashboards.
Strictly verifies that user role or tier is 'admin'.
"""

from unittest.mock import patch
import pytest
from starlette.testclient import TestClient
import jwt

from backend.app.main import app
from backend.app.config import config
from backend.app.services.analytics_service import AnalyticsService

client = TestClient(app)


def test_log_analytics_event_guest():
    """Verify that guest visitors can submit telemetry events without auth."""
    payload = {
        "event_name": "page_view",
        "session_id": "sess_test_123",
        "properties": {"path": "/", "referrer": "direct"},
    }
    res = client.post("/api/analytics/event", json=payload)
    assert res.status_code == 200
    assert res.json() == {"status": "logged"}


def test_admin_metrics_rejected_for_guest():
    """Verify that unauthenticated guests cannot access admin metrics."""
    res = client.get("/api/admin/metrics")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]


def test_admin_metrics_forbidden_for_regular_user():
    """Verify that regular non-admin authenticated users receive 403 Forbidden."""
    secret = "test_secret_for_unit_tests_32_bytes_long_ok!!"
    token = jwt.encode(
        {"sub": "regular_user_1", "email": "user@test.com", "role": "user", "tier": "free", "aud": "authenticated"},
        secret,
        algorithm="HS256",
    )

    with patch.object(config, "supabase_jwt_secret", secret):
        headers = {"Authorization": f"Bearer {token}"}
        res = client.get("/api/admin/metrics", headers=headers)
        assert res.status_code == 403
        assert "Admin privileges required" in res.json()["detail"]


def test_admin_metrics_allowed_for_admin_role_or_tier():
    """Verify that users with role='admin' or tier='admin' get full admin access."""
    secret = "test_secret_for_unit_tests_32_bytes_long_ok!!"
    token = jwt.encode(
        {"sub": "admin_user_1", "email": "anyuser@test.com", "role": "admin", "aud": "authenticated"},
        secret,
        algorithm="HS256",
    )

    with patch.object(config, "supabase_jwt_secret", secret):
        headers = {"Authorization": f"Bearer {token}"}
        res = client.get("/api/admin/metrics", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "kpis" in data
        assert "events_breakdown" in data
        assert "traffic_split" in data
        assert "system_health" in data


def test_admin_events_stream_allowed_for_admin():
    """Verify that admin can retrieve the telemetry event stream."""
    secret = "test_secret_for_unit_tests_32_bytes_long_ok!!"
    token = jwt.encode(
        {"sub": "admin_user_1", "email": "anyuser@test.com", "app_metadata": {"tier": "admin"}, "aud": "authenticated"},
        secret,
        algorithm="HS256",
    )

    with patch.object(config, "supabase_jwt_secret", secret):
        headers = {"Authorization": f"Bearer {token}"}
        res = client.get("/api/admin/events?limit=10", headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)


def test_auth_me_reflects_admin_role():
    """Verify that /api/auth/me returns is_admin=True when role or tier is admin."""
    secret = "test_secret_for_unit_tests_32_bytes_long_ok!!"
    token = jwt.encode(
        {"sub": "admin_user_1", "email": "anyuser@test.com", "role": "admin", "aud": "authenticated"},
        secret,
        algorithm="HS256",
    )

    with patch.object(config, "supabase_jwt_secret", secret):
        headers = {"Authorization": f"Bearer {token}"}
        res = client.get("/api/auth/me", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["authenticated"] is True
        assert data["user"]["is_admin"] is True

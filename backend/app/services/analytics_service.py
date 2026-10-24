"""
Analytics & Telemetry Service for NoteLoom V2.
Captures market activity, visitor telemetry, and provides admin-only metrics.
"""

from collections import deque
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import httpx

from backend.app.config import config


class AnalyticsService:
    # In-memory buffer for high-speed resilience and offline fallback
    _memory_events: deque = deque(maxlen=300)

    @classmethod
    def _get_supabase_headers(cls) -> Dict[str, str]:
        key = config.supabase_service_role_key or config.supabase_anon_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

    @classmethod
    async def log_event(
        cls,
        event_name: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Logs an activity event to Supabase analytics_events table and in-memory buffer.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "event_name": event_name,
            "user_id": user_id,
            "session_id": session_id or f"sess_{now_iso}",
            "properties": properties or {},
            "created_at": now_iso,
        }

        # Store in local memory buffer
        cls._memory_events.appendleft(payload)

        # Persist to Supabase if configured
        if config.supabase_url and (config.supabase_service_role_key or config.supabase_anon_key):
            try:
                url = f"{config.supabase_url.rstrip('/')}/rest/v1/analytics_events"
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.post(url, headers=cls._get_supabase_headers(), json=payload)
                    return res.is_success
            except Exception as e:
                # Log locally without failing customer request
                return False

        return True

    @classmethod
    async def get_admin_metrics(cls) -> Dict[str, Any]:
        """
        Aggregates executive KPIs, adoption metrics, and market telemetry for Admin dashboard.
        """
        total_users = 0
        total_notes = 0
        total_events = len(cls._memory_events)
        active_sessions_today = 0
        events_breakdown: Dict[str, int] = {}
        popular_topics: Dict[str, int] = {}
        guest_ingestions = 0
        user_ingestions = 0

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        one_day_ago = now - timedelta(days=1)
        one_day_iso = one_day_ago.isoformat()

        # 1. Fetch live database counts from Supabase if configured
        if config.supabase_url and config.supabase_service_role_key:
            headers = cls._get_supabase_headers()
            async with httpx.AsyncClient(timeout=5.0) as client:
                try:
                    # Total profiles / registered users
                    u_res = await client.get(
                        f"{config.supabase_url.rstrip('/')}/rest/v1/profiles?select=id",
                        headers={**headers, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"},
                    )
                    content_range = u_res.headers.get("content-range")
                    if content_range and "/" in content_range:
                        total_users = int(content_range.split("/")[1])
                    else:
                        total_users = len(u_res.json()) if u_res.is_success else 0
                except Exception:
                    pass

                try:
                    # Total notes created
                    n_res = await client.get(
                        f"{config.supabase_url.rstrip('/')}/rest/v1/notes?select=topic",
                        headers=headers,
                    )
                    if n_res.is_success:
                        notes_data = n_res.json()
                        total_notes = len(notes_data)
                        for n in notes_data:
                            topic = n.get("topic") or "General Software"
                            popular_topics[topic] = popular_topics.get(topic, 0) + 1
                except Exception:
                    pass

                try:
                    # Telemetry Events from past 7 days
                    seven_days_ago = (now - timedelta(days=7)).isoformat()
                    e_res = await client.get(
                        f"{config.supabase_url.rstrip('/')}/rest/v1/analytics_events?created_at=gte.{seven_days_ago}&select=event_name,user_id,session_id,created_at,properties",
                        headers=headers,
                    )
                    if e_res.is_success:
                        events_data = e_res.json()
                        total_events = max(total_events, len(events_data))
                        today_sessions = set()

                        for ev in events_data:
                            ename = ev.get("event_name", "unknown")
                            events_breakdown[ename] = events_breakdown.get(ename, 0) + 1

                            created = ev.get("created_at") or ""
                            if created >= one_day_iso:
                                sid = ev.get("session_id") or ev.get("user_id")
                                if sid:
                                    today_sessions.add(sid)

                            if ename == "lecture_ingestion_started":
                                if ev.get("user_id"):
                                    user_ingestions += 1
                                else:
                                    guest_ingestions += 1

                        active_sessions_today = len(today_sessions)
                except Exception:
                    pass

        # 2. Blend with in-memory events if Supabase data was sparse
        if not events_breakdown:
            today_sessions = set()
            for ev in cls._memory_events:
                ename = ev.get("event_name", "unknown")
                events_breakdown[ename] = events_breakdown.get(ename, 0) + 1

                created = ev.get("created_at") or ""
                if created >= one_day_iso:
                    sid = ev.get("session_id") or ev.get("user_id")
                    if sid:
                        today_sessions.add(sid)

                if ename == "lecture_ingestion_started":
                    if ev.get("user_id"):
                        user_ingestions += 1
                    else:
                        guest_ingestions += 1

            active_sessions_today = max(active_sessions_today, len(today_sessions))

        # Sort top topics
        sorted_topics = [
            {"topic": k, "count": v}
            for k, v in sorted(popular_topics.items(), key=lambda item: item[1], reverse=True)[:6]
        ]

        total_ingestions = guest_ingestions + user_ingestions
        guest_pct = round((guest_ingestions / total_ingestions) * 100, 1) if total_ingestions > 0 else 0.0
        user_pct = round((user_ingestions / total_ingestions) * 100, 1) if total_ingestions > 0 else 0.0

        return {
            "kpis": {
                "total_users": max(total_users, 1),
                "total_notes": total_notes,
                "total_events": total_events,
                "active_sessions_today": max(active_sessions_today, 1),
            },
            "events_breakdown": events_breakdown,
            "popular_topics": sorted_topics,
            "traffic_split": {
                "guest_ingestions": guest_ingestions,
                "user_ingestions": user_ingestions,
                "guest_percent": guest_pct,
                "user_percent": user_pct,
            },
            "system_health": {
                "gemini_models": {
                    "extractor": config.extractor_model,
                    "interviewer": config.interviewer_model,
                    "writer": config.writer_model,
                },
                "supabase_configured": bool(config.supabase_url and config.supabase_service_role_key),
                "server_time": now_iso,
            },
        }

    @classmethod
    async def get_admin_events(cls, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Returns recent telemetry event stream for the Admin live feed.
        """
        # Try fetching from Supabase first
        if config.supabase_url and config.supabase_service_role_key:
            try:
                headers = cls._get_supabase_headers()
                url = f"{config.supabase_url.rstrip('/')}/rest/v1/analytics_events?select=id,event_name,user_id,session_id,properties,created_at&order=created_at.desc&limit={limit}"
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.get(url, headers=headers)
                    if res.is_success:
                        events = res.json()
                        if events:
                            return events
            except Exception:
                pass

        # Fallback to in-memory events
        return list(cls._memory_events)[:limit]

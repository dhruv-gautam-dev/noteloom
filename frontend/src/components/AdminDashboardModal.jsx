import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Users,
  FileText,
  Activity,
  Zap,
  TrendingUp,
  RefreshCw,
  Globe,
  Download,
  BookOpen,
  Sparkles,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function AdminDashboardModal({ isOpen, onClose, theme = 'zen' }) {
  const [metrics, setMetrics] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      let authHeader = null;
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) {
          authHeader = `Bearer ${token}`;
        }
      }

      const headers = authHeader ? { Authorization: authHeader } : {};

      // 1. Fetch Metrics
      const metricsRes = await fetch('/api/admin/metrics', { headers });
      if (!metricsRes.ok) {
        if (metricsRes.status === 403) {
          throw new Error('Access Denied: You do not have Admin privileges.');
        }
        throw new Error('Failed to load admin analytics.');
      }
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      // 2. Fetch Live Events Stream
      const eventsRes = await fetch('/api/admin/events?limit=25', { headers });
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setRecentEvents(eventsData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalTheme = {
    zen: 'bg-white border-[#DDE5D9] text-[#142217]',
    paper: 'bg-white border-[#E7E2DA] text-[#1C1917]',
    purple: 'bg-white border-[#E9E3F5] text-[#1E162A]',
    dark: 'bg-[#0F172A] border-slate-800 text-slate-100',
  }[theme] || 'bg-white border-[#DDE5D9] text-[#142217]';

  const cardTheme = {
    zen: 'bg-[#F3F6F1]/70 border-[#DDE5D9]',
    paper: 'bg-[#FAF7F2]/70 border-[#E7E2DA]',
    purple: 'bg-[#F8F6FC]/70 border-[#E9E3F5]',
    dark: 'bg-[#1E293B]/60 border-slate-800',
  }[theme] || 'bg-[#F3F6F1]/70 border-[#DDE5D9]';

  const formatEventName = (name) => {
    switch (name) {
      case 'page_view':
        return { label: 'Page Visit', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      case 'lecture_ingestion_started':
        return { label: 'Ingest Started', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
      case 'lecture_ingestion_completed':
        return { label: 'Note Created', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
      case 'lecture_ingestion_failed':
        return { label: 'Ingest Failed', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
      case 'note_viewed':
        return { label: 'Note Read', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' };
      case 'vault_exported_zip':
        return { label: 'Vault Exported', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
      case 'flashcards_opened':
        return { label: 'Flashcards', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
      default:
        return { label: name.replace(/_/g, ' '), color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
    }
  };

  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Just now';
    const seconds = Math.floor((new Date() - new Date(isoString)) / 1000);
    if (seconds < 60) return `${Math.max(seconds, 1)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`w-full max-w-5xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${modalTheme}`}>
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Creator Analytics & Market Telemetry
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live platform adoption, visitor retention, popular engineering topics & API health
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="p-2 rounded-xl border border-black/10 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {error ? (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <div className="font-bold">Error Loading Analytics</div>
                <div>{error}</div>
              </div>
            </div>
          ) : loading && !metrics ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-purple-600" />
              <p className="text-sm font-medium">Aggregating platform telemetry from Supabase...</p>
            </div>
          ) : (
            <>
              {/* Executive KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Users */}
                <div className={`p-4 sm:p-5 rounded-2xl border ${cardTheme}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</span>
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {metrics?.kpis?.total_users ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Registered Supabase accounts</div>
                </div>

                {/* Total Notes Created */}
                <div className={`p-4 sm:p-5 rounded-2xl border ${cardTheme}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes Created</span>
                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                      <FileText className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {metrics?.kpis?.total_notes ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Saved in cloud vaults</div>
                </div>

                {/* Active Sessions Today */}
                <div className={`p-4 sm:p-5 rounded-2xl border ${cardTheme}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Today</span>
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {metrics?.kpis?.active_sessions_today ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Unique visitors in last 24h</div>
                </div>

                {/* Total Platform Events */}
                <div className={`p-4 sm:p-5 rounded-2xl border ${cardTheme}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Events</span>
                    <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                      <Zap className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {metrics?.kpis?.total_events ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Telemetry interactions logged</div>
                </div>
              </div>

              {/* Middle Section: Audience Split & Popular Topics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Audience Conversion & Split */}
                <div className={`p-5 rounded-2xl border space-y-4 ${cardTheme}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Audience Ingestion Split
                    </h3>
                    <span className="text-xs font-semibold text-purple-600">
                      Guest vs Signed-In
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Guests ({metrics?.traffic_split?.guest_ingestions ?? 0})</span>
                      <span>Users ({metrics?.traffic_split?.user_ingestions ?? 0})</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${metrics?.traffic_split?.guest_percent ?? 50}%` }}
                        title={`Guest Ingestions: ${metrics?.traffic_split?.guest_percent}%`}
                      />
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${metrics?.traffic_split?.user_percent ?? 50}%` }}
                        title={`Signed-in Ingestions: ${metrics?.traffic_split?.user_percent}%`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>{metrics?.traffic_split?.guest_percent ?? 0}% Guests</span>
                      <span>{metrics?.traffic_split?.user_percent ?? 0}% Authenticated</span>
                    </div>
                  </div>

                  {/* Feature Interaction Counter */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-bold">{metrics?.events_breakdown?.note_viewed ?? 0}</div>
                        <div className="text-[10px] text-slate-400">Notes Read</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 flex items-center gap-2">
                      <Download className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="font-bold">{metrics?.events_breakdown?.vault_exported_zip ?? 0}</div>
                        <div className="text-[10px] text-slate-400">Vaults Exported</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popular Topics in Market Demand */}
                <div className={`p-5 rounded-2xl border space-y-3.5 ${cardTheme}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Most Ingested Topics
                    </h3>
                    <span className="text-[11px] text-slate-400">Market Demand</span>
                  </div>

                  {metrics?.popular_topics?.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      No topics recorded yet. Ingest lectures to see trends.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {metrics?.popular_topics?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-medium"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded-md bg-purple-500/10 text-purple-600 text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="truncate">{item.topic}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-[11px]">
                            {item.count} notes
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Telemetry Activity Stream */}
              <div className={`p-5 rounded-2xl border space-y-3 ${cardTheme}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Telemetry Stream ({recentEvents.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Active Pipeline
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {recentEvents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      No telemetry events recorded yet.
                    </div>
                  ) : (
                    recentEvents.map((ev, idx) => {
                      const badge = formatEventName(ev.event_name);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border whitespace-nowrap ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 truncate">
                              {ev.properties?.title || ev.properties?.url || ev.properties?.filename || ev.session_id || 'Platform Action'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px] flex-shrink-0">
                            <span>{ev.user_id ? 'User' : 'Guest'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(ev.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* System & Gemini Health Footer */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Gemini Model: <strong>{metrics?.system_health?.gemini_models?.extractor || 'gemini-2.5-flash'}</strong></span>
                </div>
                <div>
                  Supabase PostgreSQL: <strong>{metrics?.system_health?.supabase_configured ? 'Connected with RLS' : 'Local Fallback'}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


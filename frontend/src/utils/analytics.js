/**
 * NoteLoom V2 - Market Telemetry & Visitor Activity Tracker
 * Transparently captures visitor engagement, conversions, and note interactions.
 */

import { supabase } from './supabaseClient';

const SESSION_KEY = 'noteloom_analytics_session_id';

/**
 * Returns or generates a persistent anonymous session ID for this browser tab.
 */
export function getAnalyticsSessionId() {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `sess_${Date.now()}`;
  }
}

/**
 * Dispatches a telemetry event to NoteLoom's backend / Supabase pipeline.
 */
export async function trackEvent(eventName, properties = {}) {
  try {
    const sessionId = getAnalyticsSessionId();
    let authHeader = null;

    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) {
          authHeader = `Bearer ${token}`;
        }
      } catch {
        // Continue anonymously
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    await fetch('/api/analytics/event', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_name: eventName,
        session_id: sessionId,
        properties: {
          ...properties,
          referrer: document.referrer || 'direct',
          timestamp: new Date().toISOString(),
          screen_width: window.innerWidth,
        },
      }),
    });
  } catch (err) {
    // Fail silently so customer UX is never degraded by analytics
    console.debug('Telemetry logging skipped:', err);
  }
}

export const trackPageView = (path = window.location.pathname) => {
  trackEvent('page_view', { path });
};

export const trackNoteViewed = (filename, title, topic) => {
  trackEvent('note_viewed', { filename, title, topic });
};

export const trackVaultExport = (noteCount) => {
  trackEvent('vault_exported_zip', { note_count: noteCount });
};

export const trackFlashcardsOpened = (cardCount, title) => {
  trackEvent('flashcards_opened', { card_count: cardCount, title });
};


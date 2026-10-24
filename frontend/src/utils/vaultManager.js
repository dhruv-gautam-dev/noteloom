/**
 * NoteLoom V2 - Dual-Mode Cloud Vault Manager
 * Seamlessly manages notes across:
 * 1. Authenticated Mode: Personal isolated cloud vault in Supabase PostgreSQL (with RLS)
 * 2. Guest Mode: Ephemeral session storage strictly isolated to the browser tab
 * 3. Client-side Cloud ZIP Export: Bundles active notes into an Obsidian-ready zip
 */

import JSZip from 'jszip';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const GUEST_STORAGE_KEY = 'noteloom_guest_notes';

/**
 * Reads ephemeral guest notes from sessionStorage.
 */
export function getStoredGuestNotes() {
  try {
    const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.debug('Failed to read guest notes from sessionStorage:', err);
  }
  return [];
}

/**
 * Retrieve notes based on user authentication state.
 * - Authenticated: Queries Supabase Cloud table for the user's isolated notes.
 * - Guest (Supabase configured): Reads strictly from browser sessionStorage (zero leakage of server/other notes).
 * - Offline dev (Supabase not configured): Reads local server vault /api/notes.
 */
export async function getVaultNotes(user = null) {
  // Mode 1: Authenticated User -> Load strictly from Supabase Cloud
  if (user && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, video_id, video_title, channel, sequence_index, topic, markdown_content, is_educational, is_fallback, created_at')
        .eq('user_id', user.id)
        .order('sequence_index', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((n) => {
          const slug = (n.video_title || 'note')
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/[-\s]+/g, '-')
            .slice(0, 60);
          const filename = `${String(n.sequence_index || 1).padStart(2, '0')}_${slug}.md`;

          return {
            id: n.id,
            video_id: n.video_id,
            filename,
            stem: filename.replace(/\.md$/, ''),
            title: n.video_title,
            channel: n.channel,
            day_number: n.sequence_index,
            topic: n.topic,
            is_educational: n.is_educational,
            is_fallback: n.is_fallback,
            is_index_or_glossary: false,
            size_bytes: n.markdown_content?.length || 0,
            markdown_content: n.markdown_content,
            is_cloud: true,
          };
        });
      }

      // If user has 0 notes in Supabase, return empty array.
      // Do NOT load or sync server notes!
      return [];
    } catch (err) {
      console.error('Failed to load cloud notes from Supabase:', err);
      return [];
    }
  }

  // Mode 2: Guest Mode (when Supabase is configured)
  // Guests ONLY see notes generated during this browser session
  if (isSupabaseConfigured) {
    return getStoredGuestNotes();
  }

  // Mode 3: Local Offline Dev Mode (Only if Supabase is NOT configured)
  try {
    const res = await fetch('/api/notes');
    if (res.ok) {
      const data = await res.json();
      return data.map((n) => ({
        id: n.filename,
        filename: n.filename,
        stem: n.stem || n.filename.replace(/\.md$/, ''),
        title: (n.stem || n.filename.replace(/\.md$/, ''))
          .replace(/^\d+_/, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        day_number: parseInt(n.filename.match(/^(\d+)_/)?.[1] || '1', 10),
        is_index_or_glossary: Boolean(n.is_index_or_glossary),
        size_bytes: n.size_bytes || 0,
        is_cloud: false,
      }));
    }
  } catch (err) {
    console.debug('Failed to fetch local server notes:', err);
  }

  return [];
}

/**
 * Loads markdown content of a single note.
 */
export async function getVaultNoteContent(noteIdentifier, user = null, cachedNotes = []) {
  if (!noteIdentifier) return null;

  // 1. Check in cached notes array first
  const cached = cachedNotes.find(
    (n) => n.id === noteIdentifier || n.filename === noteIdentifier || n.stem === noteIdentifier
  );
  if (cached?.markdown_content) {
    return cached.markdown_content;
  }

  // 2. If authenticated and note has cloud ID or we are in cloud mode
  if (user && isSupabaseConfigured && supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteIdentifier);
      let query = supabase.from('notes').select('markdown_content').eq('user_id', user.id);
      if (isUUID) {
        query = query.eq('id', noteIdentifier);
      } else {
        const stem = noteIdentifier.replace(/\.md$/, '').replace(/^\d+_/, '');
        query = query.or(`video_id.eq.${noteIdentifier},video_title.ilike.%${stem}%`);
      }
      const { data } = await query.maybeSingle();
      if (data?.markdown_content) {
        return data.markdown_content;
      }
    } catch (err) {
      console.debug('Supabase content fetch fallback:', err);
    }
  }

  // 3. Check guest session storage
  try {
    const guestNotes = getStoredGuestNotes();
    const match = guestNotes.find((gn) => gn.id === noteIdentifier || gn.filename === noteIdentifier || gn.stem === noteIdentifier);
    if (match?.markdown_content) {
      return match.markdown_content;
    }
  } catch (err) {
    console.debug('Guest session read error:', err);
  }

  // 4. Fetch from local backend API ONLY if Supabase is NOT configured (standalone dev mode)
  if (!isSupabaseConfigured) {
    try {
      const filename = cached?.filename || noteIdentifier;
      const res = await fetch(`/api/notes/${encodeURIComponent(filename)}`);
      if (res.ok) {
        const data = await res.json();
        return data.content;
      }
    } catch (err) {
      console.error('Local note content fetch error:', err);
    }
  }

  return null;
}

/**
 * Saves a newly generated note to Supabase (if logged in) or sessionStorage (if guest).
 */
export async function saveGeneratedNote(renderedNote, user = null) {
  if (!renderedNote) return;

  const videoId = renderedNote.video_id || `vid_${Date.now()}`;
  const videoTitle = renderedNote.title || 'Study Note';
  const filename = renderedNote.file_name || `${renderedNote.day_number || 1}_note.md`;
  const content = renderedNote.markdown_content || '';
  const dayNumber = renderedNote.day_number || 1;
  const isFallback = Boolean(renderedNote.is_fallback);
  const isEducational = !renderedNote.is_non_educational;

  // 1. Authenticated Mode: Save exclusively to Supabase Cloud
  if (user && isSupabaseConfigured && supabase) {
    try {
      const payload = {
        user_id: user.id,
        video_id: videoId,
        video_title: videoTitle,
        sequence_index: dayNumber,
        markdown_content: content,
        is_fallback: isFallback,
        is_educational: isEducational,
      };

      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from('notes').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('notes').insert(payload);
      }
      return; // Do NOT write to guest sessionStorage for signed-in users!
    } catch (err) {
      console.error('Error saving note to Supabase cloud:', err);
    }
  }

  // 2. Guest Mode: Store ONLY in sessionStorage for active browser session
  try {
    const existing = getStoredGuestNotes();
    const cleanNote = {
      id: `guest_${videoId}`,
      video_id: videoId,
      filename,
      stem: filename.replace(/\.md$/, ''),
      title: videoTitle,
      day_number: dayNumber,
      markdown_content: content,
      is_fallback: isFallback,
      is_educational: isEducational,
      is_cloud: false,
      size_bytes: content.length,
    };

    const updated = [cleanNote, ...existing.filter((n) => n.filename !== cleanNote.filename && n.video_id !== videoId)];
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.debug('Failed to cache guest note in sessionStorage:', err);
  }
}

/**
 * Adopts guest session notes into the user's Supabase account when they sign in.
 */
export async function adoptGuestNotesToUser(user) {
  if (!user || !isSupabaseConfigured || !supabase) return 0;

  try {
    const guestNotes = getStoredGuestNotes();
    if (!guestNotes || guestNotes.length === 0) return 0;

    let savedCount = 0;
    for (const gn of guestNotes) {
      if (!gn.markdown_content) continue;
      const videoId = gn.video_id || gn.id?.replace(/^guest_/, '') || `vid_${Date.now()}`;
      const payload = {
        user_id: user.id,
        video_id: videoId,
        video_title: gn.title || 'Study Note',
        sequence_index: gn.day_number || 1,
        markdown_content: gn.markdown_content,
        is_fallback: Boolean(gn.is_fallback),
        is_educational: gn.is_educational !== false,
      };

      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from('notes').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('notes').insert(payload);
      }
      savedCount++;
    }

    sessionStorage.removeItem(GUEST_STORAGE_KEY);
    return savedCount;
  } catch (err) {
    console.error('Failed to adopt guest notes to Supabase:', err);
    return 0;
  }
}

/**
 * Deletes a note from Supabase or Guest storage.
 */
export async function deleteVaultNote(noteItem, user = null) {
  if (user && isSupabaseConfigured && supabase && noteItem.is_cloud && noteItem.id) {
    try {
      await supabase.from('notes').delete().eq('id', noteItem.id).eq('user_id', user.id);
    } catch (err) {
      console.error('Supabase note deletion failed:', err);
    }
  }

  // Remove from guest storage
  try {
    const existing = getStoredGuestNotes();
    const filtered = existing.filter((n) => n.filename !== noteItem.filename && n.id !== noteItem.id);
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.debug('SessionStorage remove error:', err);
  }
}

/**
 * Clears all notes for the active context (User Cloud or Guest Storage).
 */
export async function clearActiveVault(user = null) {
  if (user && isSupabaseConfigured && supabase) {
    try {
      await supabase.from('notes').delete().eq('user_id', user.id);
    } catch (err) {
      console.error('Failed to clear cloud notes:', err);
    }
  } else {
    try {
      sessionStorage.removeItem(GUEST_STORAGE_KEY);
      if (!isSupabaseConfigured) {
        await fetch('/api/vault/clear', { method: 'POST' });
      }
    } catch (err) {
      console.debug('Local clear vault fallback error:', err);
    }
  }
}

/**
 * Exports all active notes as an Obsidian-ready ZIP file directly in the browser.
 */
export async function exportNotesAsZip(notes = [], user = null) {
  if (!notes || notes.length === 0) return;

  const zip = new JSZip();

  for (const note of notes) {
    const filename = note.filename || `${note.day_number || 1}_${note.title}.md`;
    let content = note.markdown_content;
    if (!content) {
      content = await getVaultNoteContent(note.filename || note.id, user, notes);
    }
    if (content) {
      zip.file(filename, content);
    }
  }

  const indexLines = [
    '# 🎯 NoteLoom Study Vault Index',
    '',
    '> Master roadmap of all video study notes in this interview preparation curriculum.',
    '',
    '## 📋 Table of Contents',
    '| Day | Note Link | Status |',
    '| :---: | :--- | :---: |',
  ];

  notes.forEach((n) => {
    const stem = n.stem || n.filename.replace(/\.md$/, '');
    const badge = n.is_fallback ? '⚠️ Transcript Missing' : n.is_educational ? '✅ Study Ready' : 'ℹ️ Notice';
    indexLines.push(`| **Day ${String(n.day_number || 1).padStart(2, '0')}** | [[${stem}]] | ${badge} |`);
  });

  zip.file('INDEX.md', indexLines.join('\n'));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = user ? `noteloom_cloud_vault_${Date.now()}.zip` : `noteloom_vault.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

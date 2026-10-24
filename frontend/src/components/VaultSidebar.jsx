import React, { useState } from 'react';
import { FileText, Search, RefreshCw, Trash2, X, Bookmark, Cloud } from 'lucide-react';

export default function VaultSidebar({
  notes = [],
  selectedFilename,
  onSelectNote,
  onRefresh,
  onClearVault,
  onOpenIngest,
  theme = 'zen',
  user = null,
}) {
  const [search, setSearch] = useState('');

  const filteredNotes = notes.filter((n) =>
    n.filename.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarTheme = {
    zen: {
      bg: 'bg-white border-[#DDE5D9]',
      textHeading: 'text-[#142217]',
      textMuted: 'text-[#4F6454]',
      searchBg: 'bg-[#F3F6F1] border-[#DDE5D9] text-[#142217] focus:border-emerald-500',
      activeItem: 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-xs',
      inactiveItem: 'text-[#37493C] hover:bg-[#F3F6F1] border-transparent',
      specialItem: 'text-emerald-800 hover:bg-emerald-50/50 border-transparent',
      iconActive: 'text-emerald-700',
    },
    paper: {
      bg: 'bg-white border-[#E7E2DA]',
      textHeading: 'text-[#1C1917]',
      textMuted: 'text-[#78716C]',
      searchBg: 'bg-[#FAF7F2] border-[#E7E2DA] text-[#1C1917] focus:border-amber-500',
      activeItem: 'bg-[#FAF2E6] border-amber-400 text-amber-900 font-bold shadow-xs',
      inactiveItem: 'text-[#44403C] hover:bg-[#FAF7F2] border-transparent',
      specialItem: 'text-amber-800 hover:bg-amber-50/50 border-transparent',
      iconActive: 'text-amber-700',
    },
    purple: {
      bg: 'bg-white border-[#E9E3F5]',
      textHeading: 'text-[#1E162A]',
      textMuted: 'text-[#685B7A]',
      searchBg: 'bg-[#F8F6FC] border-[#E9E3F5] text-[#1E162A] focus:border-purple-500',
      activeItem: 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs',
      inactiveItem: 'text-[#453755] hover:bg-[#F8F6FC] border-transparent',
      specialItem: 'text-purple-800 hover:bg-purple-50/50 border-transparent',
      iconActive: 'text-purple-700',
    },
    dark: {
      bg: 'bg-[#111827] border-[#1F293D]',
      textHeading: 'text-white',
      textMuted: 'text-slate-400',
      searchBg: 'bg-[#0B0F17] border-[#1F293D] text-slate-200 focus:border-emerald-500',
      activeItem: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-xs',
      inactiveItem: 'text-slate-300 hover:bg-slate-800/50 border-transparent',
      specialItem: 'text-emerald-400 hover:bg-emerald-950/30 border-transparent',
      iconActive: 'text-emerald-400',
    },
  }[theme] || {
    bg: 'bg-white border-[#DDE5D9]',
    textHeading: 'text-[#142217]',
    textMuted: 'text-[#4F6454]',
    searchBg: 'bg-[#F3F6F1] border-[#DDE5D9] text-[#142217] focus:border-emerald-500',
    activeItem: 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-xs',
    inactiveItem: 'text-[#37493C] hover:bg-[#F3F6F1] border-transparent',
    specialItem: 'text-emerald-800 hover:bg-emerald-50/50 border-transparent',
    iconActive: 'text-emerald-700',
  };

  return (
    <aside
      className={`w-full md:w-72 md:flex-shrink-0 md:sticky md:top-20 md:self-start md:h-[calc(100vh-6rem)] md:max-h-[calc(100vh-6rem)] rounded-3xl border p-4 flex flex-col shadow-xs transition-colors duration-200 z-30 ${sidebarTheme.bg}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {user ? (
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          )}
          <h3 className={`text-xs font-bold uppercase tracking-wider ${sidebarTheme.textHeading}`}>
            {user ? 'Cloud Vault' : 'Guest Vault'} ({notes.length})
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {notes.length > 0 && onClearVault && (
            <button
              onClick={onClearVault}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
              title={user ? 'Delete all notes in personal cloud vault' : 'Clear guest session notes'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="Refresh note list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter notes..."
          className={`w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs placeholder-slate-400 focus:outline-none transition ${sidebarTheme.searchBg}`}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-10 px-4 text-xs text-slate-400 italic space-y-2.5">
            <div>
              {notes.length === 0
                ? user
                  ? 'No notes in your Cloud Vault yet. Ingest a YouTube lecture to begin!'
                  : 'No guest notes yet. Ingest a lecture or sign in to load your Cloud Vault!'
                : 'No matching notes found.'}
            </div>
            {notes.length === 0 && onOpenIngest && (
              <button
                onClick={onOpenIngest}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold not-italic transition text-[11px]"
              >
                + Ingest Lecture
              </button>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isSelected = selectedFilename === note.filename;
            const isSpecial = note.is_index_or_glossary;

            const rawStem = note.stem || note.filename.replace(/\.md$/, '');
            const cleanTitle = rawStem
              .replace(/^\d+_/, '')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <button
                key={note.filename}
                onClick={() => onSelectNote(note.filename)}
                className={`w-full text-left px-3 py-2.5 rounded-2xl border transition flex items-center justify-between gap-2 text-xs ${
                  isSelected
                    ? sidebarTheme.activeItem
                    : isSpecial
                    ? sidebarTheme.specialItem
                    : sidebarTheme.inactiveItem
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isSelected
                        ? sidebarTheme.iconActive
                        : isSpecial
                        ? 'text-indigo-500'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{cleanTitle}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

import React, { useState } from 'react';
import { FileText, Search, BookOpen, RefreshCw, Trash2, X, Compass, Bookmark } from 'lucide-react';

export default function VaultSidebar({
  notes = [],
  selectedFilename,
  onSelectNote,
  onRefresh,
  onClearVault,
  theme = 'paper',
}) {
  const [search, setSearch] = useState('');

  const filteredNotes = notes.filter((n) =>
    n.filename.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarTheme = {
    paper: {
      bg: 'bg-white border-[#E7E2DA]',
      textHeading: 'text-[#1C1917]',
      textMuted: 'text-[#78716C]',
      searchBg: 'bg-[#FAF7F2] border-[#E7E2DA] text-[#1C1917]',
      activeItem: 'bg-[#FAF2E6] border-amber-500/40 text-amber-900 font-bold',
      inactiveItem: 'text-[#44403C] hover:bg-[#FAF7F2] border-transparent',
      specialItem: 'text-indigo-800 hover:bg-indigo-50/50 border-transparent',
    },
    dark: {
      bg: 'bg-[#111827] border-[#1F293D]',
      textHeading: 'text-white',
      textMuted: 'text-slate-400',
      searchBg: 'bg-[#0B0F17] border-[#1F293D] text-slate-200',
      activeItem: 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold',
      inactiveItem: 'text-slate-300 hover:bg-slate-800/50 border-transparent',
      specialItem: 'text-indigo-300 hover:bg-indigo-950/30 border-transparent',
    },
    zen: {
      bg: 'bg-white border-[#E0E7DC]',
      textHeading: 'text-[#142217]',
      textMuted: 'text-[#55695A]',
      searchBg: 'bg-[#F2F5F0] border-[#E0E7DC] text-[#142217]',
      activeItem: 'bg-[#EBF2E8] border-emerald-500/40 text-emerald-900 font-bold',
      inactiveItem: 'text-[#2D3A30] hover:bg-[#F2F5F0] border-transparent',
      specialItem: 'text-teal-800 hover:bg-teal-50/50 border-transparent',
    },
  }[theme] || {
    bg: 'bg-slate-900 border-slate-800',
    textHeading: 'text-white',
    textMuted: 'text-slate-400',
    searchBg: 'bg-slate-950 border-slate-800 text-slate-200',
    activeItem: 'bg-indigo-600/20 border-indigo-500 text-white font-medium',
    inactiveItem: 'text-slate-300 hover:bg-slate-800/40 border-transparent',
    specialItem: 'text-indigo-300 hover:bg-indigo-900/20 border-transparent',
  };

  return (
    <aside className={`w-full md:w-72 rounded-3xl border p-4 flex flex-col h-full shadow-xs transition-colors duration-200 ${sidebarTheme.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${sidebarTheme.textHeading}`}>
            Obsidian Vault ({notes.length})
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {notes.length > 0 && onClearVault && (
            <button
              onClick={onClearVault}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
              title="Delete all notes in vault"
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
          className={`w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs placeholder-slate-400 focus:outline-none focus:border-amber-500 transition ${sidebarTheme.searchBg}`}
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
          <div className="text-center py-10 px-4 text-xs text-slate-400 italic">
            {notes.length === 0 ? 'No notes in vault yet. Ingest a YouTube lecture to begin!' : 'No matching notes found.'}
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isSelected = selectedFilename === note.filename;
            const isSpecial = note.is_index_or_glossary;

            // Clean display title
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
                        ? 'text-amber-600 dark:text-amber-400'
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

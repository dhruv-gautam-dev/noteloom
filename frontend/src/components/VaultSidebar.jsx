import React, { useState } from 'react';
import { FileText, Search, BookOpen, AlertTriangle, RefreshCw } from 'lucide-react';

export default function VaultSidebar({
  notes = [],
  selectedFilename,
  onSelectNote,
  onRefresh,
}) {
  const [search, setSearch] = useState('');

  const filteredNotes = notes.filter((n) =>
    n.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-full md:w-72 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">Obsidian Vault</h3>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Refresh Note List"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter notes..."
          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 italic">
            No notes generated yet.<br />Submit a video link above!
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isSelected = selectedFilename === note.filename;
            const isSpecial = note.is_index_or_glossary;

            return (
              <button
                key={note.filename}
                onClick={() => onSelectNote(note.filename)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium'
                    : isSpecial
                    ? 'bg-slate-950/60 border-indigo-900/40 text-indigo-300 hover:bg-slate-800/60'
                    : 'bg-slate-950/30 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isSelected ? 'text-indigo-400' : isSpecial ? 'text-violet-400' : 'text-slate-500'
                    }`}
                  />
                  <span className="text-xs truncate">{note.stem || note.filename}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}


import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Radio, ShieldCheck, Sparkles } from 'lucide-react';

export default function Header({ onDownloadVault }) {
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'online') setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">NoteLoom</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                V2 Multi-Agent
              </span>
            </div>
            <p className="text-xs text-slate-400">YouTube ➔ Obsidian Interview Crack Notes</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300">
              {backendOnline ? 'FastAPI & Agents Online' : 'Connecting to Backend...'}
            </span>
          </div>

          <button
            onClick={onDownloadVault}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition shadow-sm"
            title="Download Obsidian Vault as .zip"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export Vault</span>
          </button>
        </div>
      </div>
    </header>
  );
}


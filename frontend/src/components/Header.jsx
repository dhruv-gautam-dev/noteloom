import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Plus, ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Header({
  onDownloadVault,
  showIngest,
  onToggleIngest,
  isProcessing,
  theme = 'paper',
}) {
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'online') setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  const headerTheme = {
    paper: {
      bg: 'bg-[#FAF7F2]/90 border-[#E7E2DA]',
      text: 'text-[#1C1917]',
      subtext: 'text-[#78716C]',
      button: 'bg-white hover:bg-[#F2ECE1] border-[#E7E2DA] text-[#1C1917]',
      badge: 'bg-[#EFEAE1] text-[#78716C]',
    },
    dark: {
      bg: 'bg-[#0B0F17]/90 border-[#1F293D]',
      text: 'text-white',
      subtext: 'text-slate-400',
      button: 'bg-[#161F30] hover:bg-[#202D45] border-[#22304A] text-slate-200',
      badge: 'bg-slate-800 text-slate-300',
    },
    zen: {
      bg: 'bg-[#F2F5F0]/90 border-[#E0E7DC]',
      text: 'text-[#142217]',
      subtext: 'text-[#55695A]',
      button: 'bg-white hover:bg-[#E5ECE0] border-[#E0E7DC] text-[#142217]',
      badge: 'bg-[#E0E7DC] text-[#55695A]',
    },
  }[theme] || {
    bg: 'bg-slate-900/80 border-slate-800',
    text: 'text-white',
    subtext: 'text-slate-400',
    button: 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200',
    badge: 'bg-slate-800 text-slate-300',
  };

  return (
    <header className={`border-b backdrop-blur-md sticky top-0 z-40 transition-colors duration-200 ${headerTheme.bg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-base tracking-tight ${headerTheme.text}`}>NoteLoom</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                STUDY DESK
              </span>
            </div>
            <p className={`text-[11px] hidden sm:block ${headerTheme.subtext}`}>
              Distraction-free technical study notes & mental models
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Ingest Toggle Button */}
          <button
            onClick={onToggleIngest}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              showIngest
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : headerTheme.button
            }`}
          >
            {showIngest ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Reading View</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Show Pipeline' : 'Ingest Lecture'}</span>
              </>
            )}
          </button>

          {/* Backend Status indicator */}
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] ${headerTheme.badge}`}>
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{backendOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Export Button */}
          <button
            onClick={onDownloadVault}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${headerTheme.button}`}
            title="Download Obsidian Vault as .zip"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Export Vault</span>
          </button>
        </div>
      </div>
    </header>
  );
}

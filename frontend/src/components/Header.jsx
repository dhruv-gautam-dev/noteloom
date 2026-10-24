import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Plus, ChevronUp, Leaf, LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function Header({
  onDownloadVault,
  showIngest,
  onToggleIngest,
  isProcessing,
  theme = 'zen',
  user = null,
  onOpenAuth,
  onSignOut,
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
    zen: {
      bg: 'bg-[#F3F6F1]/90 border-[#DDE5D9]',
      text: 'text-[#142217]',
      subtext: 'text-[#4F6454]',
      button: 'bg-white hover:bg-[#EAF1E7] border-[#DDE5D9] text-[#142217]',
      activeButton: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
      badge: 'bg-[#EAF1E7] text-[#4F6454] border-[#D1E0CD]',
      logoBg: 'bg-emerald-600 text-white',
      chip: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    paper: {
      bg: 'bg-[#FAF7F2]/90 border-[#E7E2DA]',
      text: 'text-[#1C1917]',
      subtext: 'text-[#78716C]',
      button: 'bg-white hover:bg-[#F2ECE1] border-[#E7E2DA] text-[#1C1917]',
      activeButton: 'bg-amber-600 text-white border-amber-600 shadow-sm',
      badge: 'bg-[#F2ECE1] text-[#78716C] border-[#E2D8C7]',
      logoBg: 'bg-amber-500 text-white',
      chip: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    purple: {
      bg: 'bg-[#F8F6FC]/90 border-[#E9E3F5]',
      text: 'text-[#1E162A]',
      subtext: 'text-[#685B7A]',
      button: 'bg-white hover:bg-[#F1ECFA] border-[#E9E3F5] text-[#1E162A]',
      activeButton: 'bg-purple-600 text-white border-purple-600 shadow-sm',
      badge: 'bg-[#F1ECFA] text-[#685B7A] border-[#DDD3EF]',
      logoBg: 'bg-purple-600 text-white',
      chip: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    dark: {
      bg: 'bg-[#0B0F17]/90 border-[#1F293D]',
      text: 'text-white',
      subtext: 'text-slate-400',
      button: 'bg-[#161F30] hover:bg-[#202D45] border-[#22304A] text-slate-200',
      activeButton: 'bg-emerald-600 text-white border-emerald-500 shadow-sm',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
      logoBg: 'bg-emerald-600 text-white',
      chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  }[theme] || {
    bg: 'bg-[#F3F6F1]/90 border-[#DDE5D9]',
    text: 'text-[#142217]',
    subtext: 'text-[#4F6454]',
    button: 'bg-white hover:bg-[#EAF1E7] border-[#DDE5D9] text-[#142217]',
    activeButton: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    badge: 'bg-[#EAF1E7] text-[#4F6454] border-[#D1E0CD]',
    logoBg: 'bg-emerald-600 text-white',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };

  return (
    <header className={`border-b backdrop-blur-md sticky top-0 z-40 transition-colors duration-200 ${headerTheme.bg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${headerTheme.logoBg}`}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-base tracking-tight ${headerTheme.text}`}>NoteLoom</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${headerTheme.chip}`}>
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
                ? headerTheme.activeButton
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
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* User Authentication Pill / Sign In Button */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-black/10 dark:border-white/10">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs"
                title={`Signed in as ${user.email}`}
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-semibold max-w-[100px] truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className={`p-1.5 rounded-xl border text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition ${headerTheme.button}`}
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs ${headerTheme.activeButton}`}
              title="Sign in to save your notes to personal cloud vault"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

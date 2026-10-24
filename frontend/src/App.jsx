import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Youtube, Layers, BookOpen, AlertCircle, ArrowRight, RotateCcw, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import Header from './components/Header';
import AgentStepper from './components/AgentStepper';
import VaultSidebar from './components/VaultSidebar';
import NoteViewer from './components/NoteViewer';
import AuthModal from './components/AuthModal';
import { supabase, signOut, getSession } from './utils/supabaseClient';

export default function App() {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [events, setEvents] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Ingestion Drawer state (collapsed by default if notes already exist)
  const [showIngest, setShowIngest] = useState(false);

  // User Authentication State
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Vault Notes State
  const [notes, setNotes] = useState([]);
  const [selectedFilename, setSelectedFilename] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);

  // Reading Experience Settings (Default to the loved 'zen' green leaves mode!)
  const [theme, setTheme] = useState('zen'); // 'zen' | 'purple' | 'dark'
  const [isZenMode, setIsZenMode] = useState(false);

  // Fetch existing notes
  const refreshNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
        if (!selectedFilename && data.length > 0) {
          loadNoteContent(data[0].filename);
        } else if (data.length === 0) {
          setShowIngest(true); // Open drawer if vault is empty
        }
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  // Restore latest job state on page reload
  const checkLatestJob = async () => {
    try {
      const res = await fetch('/api/jobs/latest');
      if (res.ok) {
        const job = await res.json();
        if (job && job.job_id) {
          setJobId(job.job_id);
          if (job.url) setUrl(job.url);
          if (job.events && job.events.length > 0) {
            setEvents(job.events);
            const lastEvent = job.events[job.events.length - 1];
            setCurrentStep(lastEvent.step);
          }
          if (job.status === 'processing') {
            setIsProcessing(true);
            setShowIngest(true);
            startEventStream(job.job_id);
          } else if (job.status === 'failed') {
            setErrorMessage(job.error_message || 'Pipeline execution failed.');
          }
        }
      }
    } catch (err) {
      console.warn('Could not restore latest job state:', err);
    }
  };

  useEffect(() => {
    refreshNotes();
    checkLatestJob();

    // Listen to Supabase Auth State Changes
    if (supabase) {
      getSession().then((session) => {
        setUser(session?.user || null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });

      return () => subscription?.unsubscribe();
    }
  }, []);

  const loadNoteContent = async (filename) => {
    setSelectedFilename(filename);
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(filename)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedContent(data.content);
      }
    } catch (err) {
      console.error('Failed to load note content:', err);
    }
  };

  // Reset UI View to start clean
  const handleResetState = () => {
    setJobId(null);
    setCurrentStep(null);
    setEvents([]);
    setIsProcessing(false);
    setErrorMessage(null);
    setUrl('');
  };

  // Clear all vault notes for a fresh start
  const handleClearVault = async () => {
    if (!window.confirm("Are you sure you want to delete all notes in the vault for a fresh start?")) return;
    try {
      await fetch('/api/vault/clear', { method: 'POST' });
      setNotes([]);
      setSelectedFilename(null);
      setSelectedContent(null);
      setShowIngest(true);
      handleResetState();
    } catch (err) {
      console.error('Failed to clear vault:', err);
    }
  };

  // Submit YouTube URL & Start Multi-Agent Pipeline
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsProcessing(true);
    setShowIngest(true);
    setErrorMessage(null);
    setEvents([]);
    setCurrentStep('ingestion');

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to start job');
      }

      const data = await res.json();
      setJobId(data.job_id);
      startEventStream(data.job_id);
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(err.message);
    }
  };

  // Connect to Server-Sent Events (SSE) Stream
  const startEventStream = (activeJobId) => {
    const eventSource = new EventSource(`/api/jobs/${activeJobId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const jobEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, jobEvent]);

        if (jobEvent.step) {
          setCurrentStep(jobEvent.step);
        }

        if (jobEvent.step === 'done') {
          setIsProcessing(false);
          eventSource.close();
          refreshNotes();
        } else if (jobEvent.status === 'failed') {
          setIsProcessing(false);
          setErrorMessage(jobEvent.message);
          eventSource.close();
        }
      } catch (err) {
        console.warn('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsProcessing(false);
      refreshNotes();
    };
  };

  const handleDownloadVault = () => {
    window.location.href = '/api/download/vault';
  };

  // App container theme styles
  const appBackground = {
    zen: 'bg-[#F3F6F1] text-[#142217]',
    paper: 'bg-[#FAF7F2] text-[#1C1917]',
    purple: 'bg-[#F8F6FC] text-[#1E162A]',
    dark: 'bg-[#0A0E17] text-[#F1F5F9]',
  }[theme] || 'bg-[#F3F6F1] text-[#142217]';

  const drawerCard = {
    zen: 'bg-white border-[#DDE5D9] shadow-sm',
    paper: 'bg-white border-[#E7E2DA] shadow-sm',
    purple: 'bg-white border-[#E9E3F5] shadow-sm',
    dark: 'bg-[#111827] border-[#1F293D] shadow-xl',
  }[theme] || 'bg-white border-[#DDE5D9]';

  const buttonStyle = {
    zen: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs',
    paper: 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs',
    purple: 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs',
    dark: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs',
  }[theme] || 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${appBackground}`}>
      <Header
        onDownloadVault={handleDownloadVault}
        showIngest={showIngest}
        onToggleIngest={() => setShowIngest((prev) => !prev)}
        isProcessing={isProcessing}
        theme={theme}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={signOut}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col gap-4">
        {/* Collapsible Lecture Ingestion & Pipeline Drawer */}
        {showIngest && (
          <section className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className={`rounded-3xl border p-5 sm:p-6 relative overflow-hidden ${drawerCard}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold">Ingest Technical Lecture or Playlist</h2>
                    <p className="text-xs text-slate-500">
                      Extracts grounded concepts, analogies, WHO does the work, gotchas & interview Q&As
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIngest(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Close Ingestion Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-3xl">
                <div className="relative flex-1">
                  <Youtube className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube video or playlist URL..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-500/5 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessing || !url.trim()}
                  className={`px-5 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs transition flex items-center justify-center gap-2 whitespace-nowrap ${buttonStyle}`}
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Pipeline Running...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Study Notes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {(events.length > 0 || errorMessage || url) && (
                  <button
                    type="button"
                    onClick={handleResetState}
                    className="px-3 py-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-xs font-medium flex items-center justify-center gap-1 transition"
                    title="Clear inputs and start fresh"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </form>

              {/* Quick Test Pill */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Quick Test:</span>
                <button
                  type="button"
                  onClick={() => setUrl('https://www.youtube.com/watch?v=e7oU6ZCvRrw')}
                  className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 transition"
                >
                  Episode 04 : Tokens Explained
                </button>
                <button
                  type="button"
                  onClick={() => setUrl('https://www.youtube.com/watch?v=solZdnrrtG4')}
                  className="px-2.5 py-0.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-800 dark:text-purple-300 transition"
                >
                  Episode 08 : ReAct Intro to AI Agents
                </button>
              </div>

              {errorMessage && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-xs hover:underline ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Real-time Agent Execution Stepper */}
              {(isProcessing || events.length > 0) && (
                <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5">
                  <AgentStepper
                    currentStep={currentStep}
                    events={events}
                    isProcessing={isProcessing}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Study Sanctuary: Vault Sidebar + NoteViewer */}
        <section className="flex-1 flex flex-col md:flex-row gap-5 items-start min-h-[620px]">
          {/* Collapsible Sidebar */}
          {!isZenMode && (
            <VaultSidebar
              notes={notes}
              selectedFilename={selectedFilename}
              onSelectNote={loadNoteContent}
              onRefresh={refreshNotes}
              onClearVault={handleClearVault}
              theme={theme}
            />
          )}

          {/* Master Note Viewer */}
          <div className="flex-1 w-full min-w-0">
            <NoteViewer
              filename={selectedFilename}
              content={selectedContent}
              isZenMode={isZenMode}
              onToggleZenMode={() => setIsZenMode((prev) => !prev)}
              theme={theme}
              onSelectTheme={setTheme}
            />
          </div>
        </section>
      </main>

      {/* Supabase Cloud Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}

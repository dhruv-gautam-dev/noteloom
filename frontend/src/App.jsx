import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Youtube, Layers, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';
import Header from './components/Header';
import AgentStepper from './components/AgentStepper';
import VaultSidebar from './components/VaultSidebar';
import NoteViewer from './components/NoteViewer';

export default function App() {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [events, setEvents] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Vault Notes State
  const [notes, setNotes] = useState([]);
  const [selectedFilename, setSelectedFilename] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);

  // Fetch existing notes on mount
  const refreshNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
        if (!selectedFilename && data.length > 0) {
          loadNoteContent(data[0].filename);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  useEffect(() => {
    refreshNotes();
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

  // Submit YouTube URL & Start Multi-Agent Pipeline
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsProcessing(true);
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header onDownloadVault={handleDownloadVault} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Top Hero / URL Input Box */}
        <section className="mb-8">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-3xl mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Staff-Level Technical Interview Preparation
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Turn YouTube Lectures into Obsidian Interview Vaults
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-2">
                Paste any YouTube video or playlist link (DSA, System Design, Distributed Systems). Our 7-agent team extracts grounded mechanisms, FAANG mock questions, trade-offs, and spaced flashcards.
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-3xl">
              <div className="relative flex-1">
                <Youtube className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or playlist URL"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 shadow-inner transition"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing || !url.trim()}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Agents Working...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Notes</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Example Pill Shortcuts */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500">Quick Test:</span>
              <button
                type="button"
                onClick={() => setUrl('https://www.youtube.com/watch?v=TEST_RAFT_CONSENSUS')}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition"
              >
                Sample Raft Consensus (Fallback Test)
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </section>

        {/* Live Multi-Agent Execution Stepper */}
        {(isProcessing || events.length > 0) && (
          <AgentStepper
            currentStep={currentStep}
            events={events}
            isProcessing={isProcessing}
          />
        )}

        {/* Notes Explorer & Obsidian Viewer */}
        <section className="flex-1 flex flex-col md:flex-row gap-6 min-h-[550px]">
          <VaultSidebar
            notes={notes}
            selectedFilename={selectedFilename}
            onSelectNote={loadNoteContent}
            onRefresh={refreshNotes}
          />
          <NoteViewer
            filename={selectedFilename}
            content={selectedContent}
          />
        </section>
      </main>
    </div>
  );
}


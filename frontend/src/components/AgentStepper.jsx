import React, { useEffect, useRef } from 'react';
import {
  Compass,
  FileText,
  Brain,
  Award,
  CheckCircle2,
  PenTool,
  Database,
  Loader2,
  Terminal,
} from 'lucide-react';

const AGENT_STEPS = [
  { key: 'ingestion', label: 'Ingestion Scout', icon: Compass },
  { key: 'transcript', label: 'Subtitle Cleaner', icon: FileText },
  { key: 'concepts', label: 'Teacher & Note-Maker', icon: Brain },
  { key: 'synthesis', label: 'Notes Architect', icon: PenTool },
  { key: 'memory', label: 'Playlist Memory', icon: Database },
];

export default function AgentStepper({ currentStep, events = [], isProcessing }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events]);

  const getStepIndex = (stepKey) => AGENT_STEPS.findIndex((s) => s.key === stepKey);
  const activeIdx = getStepIndex(currentStep);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Multi-Agent Processing Pipeline</span>
            {isProcessing && (
              <span className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                Agents Active
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time execution across 7 specialized technical agents
          </p>
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {AGENT_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = activeIdx > idx || currentStep === 'done';
          const isCurrent = activeIdx === idx && isProcessing;

          return (
            <div
              key={step.key}
              className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                isCurrent
                  ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10 scale-105'
                  : isDone
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white animate-pulse'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-xs font-semibold line-clamp-1">
                {step.label}
              </span>
              <span className="text-[10px] mt-1 text-slate-400 uppercase tracking-wider font-mono">
                {isCurrent ? 'Running...' : isDone ? 'Done' : `Step ${idx + 1}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live Event Terminal Log */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-900 text-xs font-mono text-slate-400">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>Agent Live Stream Feed (SSE)</span>
          <span className="ml-auto text-[10px] text-slate-500">
            {events.length} events logged
          </span>
        </div>
        <div
          ref={terminalRef}
          className="h-32 overflow-y-auto space-y-1.5 font-mono text-xs pr-2"
        >
          {events.length === 0 ? (
            <div className="text-slate-600 italic">Ready. Enter a YouTube URL above to begin note generation.</div>
          ) : (
            events.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-slate-300 leading-relaxed">
                <span className="text-indigo-400 font-semibold select-none">❯</span>
                <span className="text-slate-500 text-[10px] pt-0.5 whitespace-nowrap">
                  {ev.timestamp ? ev.timestamp.split('T')[1].slice(0, 8) : ''}
                </span>
                <span className="text-violet-300 font-medium whitespace-nowrap">
                  [{ev.agent_name || 'Agent'}]:
                </span>
                <span className={ev.status === 'failed' ? 'text-rose-400' : 'text-slate-300'}>
                  {ev.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


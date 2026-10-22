import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Sparkles, FileText } from 'lucide-react';
import FlashcardModal from './FlashcardModal';

export default function NoteViewer({ filename, content }) {
  const [copied, setCopied] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper: Extract flashcards formatted as:
  // Question #flashcards
  // ?
  // Answer
  const extractFlashcards = (mdText) => {
    if (!mdText) return [];
    const cards = [];
    const regex = /([^?\n]+)#flashcards\s*\n\?\s*\n([^\n]+)/g;
    let match;
    while ((match = regex.exec(mdText)) !== null) {
      cards.push({
        front: match[1].trim(),
        back: match[2].trim(),
      });
    }
    return cards;
  };

  const flashcards = extractFlashcards(content);

  // Custom renderer for Obsidian callouts in markdown
  const renderCallout = (children) => {
    // Check if children contain [!NOTE], [!WARNING], [!DANGER]
    return <blockquote className="my-3 pl-4 border-l-2 border-indigo-500 italic text-slate-300">{children}</blockquote>;
  };

  if (!content) {
    return (
      <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-lg">
        <FileText className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-base font-semibold text-slate-300 mb-1">No Note Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Select a note from the left sidebar to preview its Obsidian study content, trade-offs, and interview questions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col h-full shadow-lg overflow-hidden">
      {/* Top Action Bar */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-sm text-white truncate max-w-md">{filename}</span>
        </div>

        <div className="flex items-center gap-2">
          {flashcards.length > 0 && (
            <button
              onClick={() => setFlashcardsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Study {flashcards.length} Flashcards</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
          </button>
        </div>
      </div>

      {/* Markdown Content Area */}
      <div className="flex-1 overflow-y-auto p-8 prose prose-invert prose-indigo max-w-none text-slate-200 text-sm leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-white border-b border-slate-800 pb-3 mb-6" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-indigo-200 mt-8 mb-4 flex items-center gap-2" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-white mt-6 mb-2" {...props} />,
            h4: ({ node, ...props }) => <h4 className="text-sm font-semibold text-slate-200 mt-4 mb-1" {...props} />,
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-6 rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs border-collapse" {...props} />
              </div>
            ),
            th: ({ node, ...props }) => <th className="bg-slate-900 px-4 py-3 font-semibold text-indigo-300 border-b border-slate-800" {...props} />,
            td: ({ node, ...props }) => <td className="px-4 py-3 border-b border-slate-900/60 text-slate-300 align-top" {...props} />,
            code: ({ node, inline, ...props }) =>
              inline ? (
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs" {...props} />
              ) : (
                <code className="block p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300" {...props} />
              ),
            blockquote: ({ node, children, ...props }) => {
              // Simple check for callouts text
              const textContent = String(children?.[0]?.props?.children || '');
              if (textContent.includes('[!NOTE]')) {
                return (
                  <div className="callout callout-note">
                    <div className="callout-title">💡 60-Second Elevator Pitch</div>
                    <div>{children}</div>
                  </div>
                );
              }
              if (textContent.includes('[!WARNING]')) {
                return (
                  <div className="callout callout-warning">
                    <div className="callout-title">⚠️ Notice / Fallback</div>
                    <div>{children}</div>
                  </div>
                );
              }
              if (textContent.includes('[!DANGER]')) {
                return (
                  <div className="callout callout-danger">
                    <div className="callout-title">🚨 Common Candidate Traps</div>
                    <div>{children}</div>
                  </div>
                );
              }
              return <blockquote className="my-4 pl-4 border-l-2 border-indigo-500 italic text-slate-300" {...props}>{children}</blockquote>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Interactive Flashcard Modal */}
      <FlashcardModal
        isOpen={flashcardsOpen}
        onClose={() => setFlashcardsOpen(false)}
        cards={flashcards}
      />
    </div>
  );
}


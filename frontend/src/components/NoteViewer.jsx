import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  Sparkles,
  FileText,
  Lightbulb,
  Cpu,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  BookOpen,
  ArrowRight,
  Code2,
  Target,
  Clock,
  Compass,
  Eye,
  EyeOff,
  Leaf,
  Sun,
  Sparkle,
  Moon,
  CheckCircle2,
  Layers
} from 'lucide-react';
import FlashcardModal from './FlashcardModal';
import { parseNoteContent } from '../utils/noteParser';

export default function NoteViewer({
  filename,
  content,
  isZenMode,
  onToggleZenMode,
  theme = 'zen',
  onSelectTheme,
}) {
  const [copied, setCopied] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [fontStyle, setFontStyle] = useState('sans'); // 'sans' | 'serif'
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [allAnswersRevealed, setAllAnswersRevealed] = useState(false);

  // Parse structured teacher note
  const parsed = useMemo(() => {
    return parseNoteContent(content);
  }, [content]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle single question answer reveal
  const toggleAnswer = (key) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle all answers at once
  const toggleAllAnswers = () => {
    const nextState = !allAnswersRevealed;
    setAllAnswersRevealed(nextState);
    if (parsed.isTeacherNote) {
      const updated = {};
      parsed.concepts.forEach((c) => {
        c.interviewQuestions.forEach((_, qIdx) => {
          updated[`${c.index}-${qIdx}`] = nextState;
        });
      });
      setRevealedAnswers(updated);
    }
  };

  // Extract flashcards from parsed data or markdown
  const flashcards = useMemo(() => {
    if (!content) return [];
    if (parsed.isTeacherNote && parsed.concepts.length > 0) {
      const cards = [];
      parsed.concepts.forEach((c) => {
        c.interviewQuestions.forEach((q) => {
          cards.push({
            front: q.question,
            back: q.answer,
          });
        });
      });
      if (cards.length > 0) return cards;
    }

    const fallbackCards = [];
    const qPattern = /-\s*\*\*Q(?:\s*\(Extra\))?:\*\*\s*(.+?)\n\s*-\s*\*\*A:\*\*\s*(.+?)(?=\n\s*-|\n\n|$)/gs;
    let qMatch;
    while ((qMatch = qPattern.exec(content)) !== null) {
      fallbackCards.push({
        front: qMatch[1].trim(),
        back: qMatch[2].trim(),
      });
    }
    return fallbackCards;
  }, [content, parsed]);

  // Theme-specific CSS classes (Green Leaves, Warm Amber, Purple Light, Midnight Dark)
  const themeStyles = {
    zen: {
      canvas: 'bg-[#F3F6F1] text-[#142217]',
      card: 'bg-white border-[#DDE5D9] shadow-sm',
      cardHover: 'hover:border-emerald-300',
      textMuted: 'text-[#4F6454]',
      textHeading: 'text-[#142217]',
      accentBg: 'bg-[#EAF1E7]',
      accentBorder: 'border-[#D1E0CD]',
      topBar: 'bg-[#F3F6F1]/90 border-[#DDE5D9]',
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      analogyBg: 'bg-gradient-to-br from-[#F0F7F1] to-[#E8F3EA] border-emerald-300 text-emerald-950',
      analogyBadge: 'bg-emerald-200/90 text-emerald-900 border-emerald-400',
      goalBg: 'bg-[#EDF5EE] border-emerald-200 text-emerald-950',
      flowBg: 'bg-[#EEF7F8] border-[#CCEAEB] text-[#115052]',
      exampleBg: 'bg-[#EDF6F0] border-[#C8E4D1] text-[#13572E]',
      dangerBg: 'bg-[#FDF2F0] border-[#F6CBC5] text-[#8C231F]',
      codeBg: 'bg-[#141B17] text-[#E2E8F0]',
      primaryColor: 'emerald',
      activeRecallText: 'text-emerald-700 hover:text-emerald-800',
      jumpPillActive: 'text-emerald-700',
      highlightClass: 'bg-emerald-200/60 text-emerald-950 px-1 py-0.5 rounded',
      buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    },
    paper: {
      canvas: 'bg-[#FAF7F2] text-[#1C1917]',
      card: 'bg-white border-[#E7E2DA] shadow-sm',
      cardHover: 'hover:border-amber-300',
      textMuted: 'text-[#68635B]',
      textHeading: 'text-[#1C1917]',
      accentBg: 'bg-[#F2ECE1]',
      accentBorder: 'border-[#E2D8C7]',
      topBar: 'bg-[#FAF7F2]/90 border-[#E7E2DA]',
      badge: 'bg-amber-100 text-amber-800 border border-amber-300',
      analogyBg: 'bg-gradient-to-br from-[#FEF8EC] to-[#FDF4E1] border-[#EED9A6] text-[#714B15]',
      analogyBadge: 'bg-[#F9E6BF] text-[#784E14] border-[#E7C687]',
      goalBg: 'bg-[#FDF6E8] border-[#EED7A1] text-amber-950',
      flowBg: 'bg-[#F3F7FA] border-[#D1E1EC] text-[#184563]',
      exampleBg: 'bg-[#F1F8F5] border-[#CFE8DD] text-[#145337]',
      dangerBg: 'bg-[#FEF2F1] border-[#F9CBC5] text-[#912023]',
      codeBg: 'bg-[#181D26] text-[#E2E8F0]',
      primaryColor: 'amber',
      activeRecallText: 'text-amber-700 hover:text-amber-800',
      jumpPillActive: 'text-amber-700',
      highlightClass: 'bg-amber-200/60 text-amber-950 px-1 py-0.5 rounded',
      buttonPrimary: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    purple: {
      canvas: 'bg-[#F8F6FC] text-[#1E162A]',
      card: 'bg-white border-[#E9E3F5] shadow-sm',
      cardHover: 'hover:border-purple-300',
      textMuted: 'text-[#685B7A]',
      textHeading: 'text-[#1E162A]',
      accentBg: 'bg-[#F1ECFA]',
      accentBorder: 'border-[#DDD3EF]',
      topBar: 'bg-[#F8F6FC]/90 border-[#E9E3F5]',
      badge: 'bg-purple-100 text-purple-800 border border-purple-300',
      analogyBg: 'bg-gradient-to-br from-[#F6F2FC] to-[#EEE7FA] border-purple-300 text-purple-950',
      analogyBadge: 'bg-purple-200/90 text-purple-900 border-purple-400',
      goalBg: 'bg-[#F4EFFC] border-purple-200 text-purple-950',
      flowBg: 'bg-[#F0F4FA] border-[#D4E0F3] text-[#1E3B68]',
      exampleBg: 'bg-[#F5F2F9] border-[#DFD5ED] text-[#4A2E78]',
      dangerBg: 'bg-[#FDF2F1] border-[#F8CBC6] text-[#8F2420]',
      codeBg: 'bg-[#171322] text-[#E2E8F0]',
      primaryColor: 'purple',
      activeRecallText: 'text-purple-700 hover:text-purple-800',
      jumpPillActive: 'text-purple-700',
      highlightClass: 'bg-purple-200/60 text-purple-950 px-1 py-0.5 rounded',
      buttonPrimary: 'bg-purple-600 hover:bg-purple-500 text-white',
    },
    dark: {
      canvas: 'bg-[#0B0F17] text-[#E2E8F0]',
      card: 'bg-[#111827] border-[#1F293D] shadow-md',
      cardHover: 'hover:border-[#2E3E5C]',
      textMuted: 'text-[#94A3B8]',
      textHeading: 'text-white',
      accentBg: 'bg-[#172033]',
      accentBorder: 'border-[#22304A]',
      topBar: 'bg-[#0B0F17]/90 border-[#1F293D]',
      badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      analogyBg: 'bg-gradient-to-br from-emerald-950/25 to-teal-900/15 border-emerald-500/30 text-emerald-100',
      analogyBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      goalBg: 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100',
      flowBg: 'bg-sky-950/25 border-sky-500/30 text-sky-100',
      exampleBg: 'bg-emerald-950/25 border-emerald-500/30 text-emerald-100',
      dangerBg: 'bg-rose-950/30 border-rose-500/30 text-rose-100',
      codeBg: 'bg-[#06090F] text-[#E2E8F0]',
      primaryColor: 'emerald',
      activeRecallText: 'text-emerald-400 hover:text-emerald-300',
      jumpPillActive: 'text-emerald-400',
      highlightClass: 'bg-emerald-950/60 text-emerald-200 px-1 py-0.5 rounded border border-emerald-500/30',
      buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    },
  }[theme] || themeStyles.zen;

  // Font family options (Sans, Serif, and Virgil / Excalidraw)
  const fontClass = {
    sans: 'font-sans',
    serif: 'font-reading-serif',
    virgil: 'font-reading-hand text-[1.05rem]',
  }[fontStyle] || 'font-sans';

  if (!content) {
    return (
      <div className={`flex-1 rounded-3xl p-12 flex flex-col items-center justify-center text-center border ${themeStyles.canvas} ${themeStyles.card}`}>
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className={`text-lg font-bold mb-1 ${themeStyles.textHeading}`}>No Study Note Selected</h3>
        <p className={`text-sm max-w-md ${themeStyles.textMuted}`}>
          Choose a lecture from the sidebar on the left to start revising concise, interview-ready concepts and mental models.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 rounded-3xl border flex flex-col h-full overflow-hidden transition-colors duration-200 ${themeStyles.canvas} ${themeStyles.card}`}>
      {/* Sleek Reading Toolbar */}
      <div className={`px-6 py-3.5 border-b backdrop-blur-md sticky top-0 z-20 flex items-center justify-between flex-wrap gap-3 ${themeStyles.topBar}`}>
        {/* Note Title & Filename */}
        <div className="flex items-center gap-2.5 truncate max-w-sm sm:max-w-md">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <BookOpen className="w-4 h-4" />
          </span>
          <div className="truncate">
            <div className={`text-xs font-bold truncate ${themeStyles.textHeading}`}>
              {parsed.meta?.video_title || filename}
            </div>
            {parsed.meta?.channel && (
              <div className={`text-[11px] truncate ${themeStyles.textMuted}`}>
                {parsed.meta.channel} {parsed.meta.day_number ? `• Day ${parsed.meta.day_number}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Reading Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Recall Answer Toggle */}
          {parsed.isTeacherNote && (
            <button
              onClick={toggleAllAnswers}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                allAnswersRevealed
                  ? `${themeStyles.accentBg} ${themeStyles.accentBorder} ${themeStyles.activeRecallText}`
                  : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border-transparent text-slate-500'
              }`}
              title={allAnswersRevealed ? 'Hide Answers for active recall' : 'Show all answers'}
            >
              {allAnswersRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{allAnswersRevealed ? 'Hide Answers' : 'Recall Mode'}</span>
            </button>
          )}

          {/* Flashcard Modal Button */}
          {flashcards.length > 0 && (
            <button
              onClick={() => setFlashcardsOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition ${themeStyles.buttonPrimary}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{flashcards.length} Cards</span>
            </button>
          )}

          {/* Typography Mode: Sans vs Serif vs Excalidraw Virgil */}
          <div className={`flex items-center p-0.5 rounded-xl border ${themeStyles.accentBorder} ${themeStyles.accentBg}`}>
            <button
              onClick={() => setFontStyle('sans')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                fontStyle === 'sans' ? 'bg-white dark:bg-slate-800 shadow-xs font-bold text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
              title="Modern Clean Sans"
            >
              Sans
            </button>
            <button
              onClick={() => setFontStyle('serif')}
              className={`px-2 py-1 rounded-lg text-xs font-reading-serif font-medium transition ${
                fontStyle === 'serif' ? 'bg-white dark:bg-slate-800 shadow-xs font-bold text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
              title="Editorial Book Serif"
            >
              Serif
            </button>
            <button
              onClick={() => setFontStyle('virgil')}
              className={`px-2.5 py-1 rounded-lg text-xs font-reading-hand font-medium transition ${
                fontStyle === 'virgil' ? 'bg-white dark:bg-slate-800 shadow-xs font-bold text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
              title="Excalidraw Handwritten (Virgil)"
            >
              Virgil
            </button>
          </div>

          {/* Theme Selector (Zen Green, Warm Amber, Purple Light, Midnight Dark) */}
          <div className={`flex items-center p-0.5 rounded-xl border ${themeStyles.accentBorder} ${themeStyles.accentBg}`}>
            <button
              onClick={() => onSelectTheme('zen')}
              className={`p-1.5 rounded-lg text-xs transition ${theme === 'zen' ? 'bg-white shadow-xs text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
              title="Matcha Zen (Green Leaves Mode)"
            >
              <Leaf className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectTheme('paper')}
              className={`p-1.5 rounded-lg text-xs transition ${theme === 'paper' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
              title="Warm Paper (Amber Notion Mode)"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectTheme('purple')}
              className={`p-1.5 rounded-lg text-xs transition ${theme === 'purple' ? 'bg-white shadow-xs text-purple-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
              title="Lilac Purple (Clean Light Mode)"
            >
              <Sparkle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectTheme('dark')}
              className={`p-1.5 rounded-lg text-xs transition ${theme === 'dark' ? 'bg-slate-800 shadow-xs text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}
              title="Midnight Obsidian Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zen Focus Mode Button */}
          {onToggleZenMode && (
            <button
              onClick={onToggleZenMode}
              className={`p-2 rounded-xl border transition ${themeStyles.accentBorder} ${themeStyles.cardHover} ${themeStyles.textMuted}`}
              title={isZenMode ? 'Exit Zen Mode (Show Sidebar)' : 'Zen Focus Mode (Hide Sidebar)'}
            >
              {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`p-2 rounded-xl border transition ${themeStyles.accentBorder} ${themeStyles.cardHover} ${themeStyles.textMuted}`}
            title="Copy Raw Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Reading Canvas */}
      <div className={`flex-1 overflow-y-auto px-6 sm:px-12 lg:px-16 py-8 ${fontClass}`}>
        <div className="max-w-3xl mx-auto space-y-10">
          {parsed.isTeacherNote ? (
            <>
              {/* Note Header & Goal Banner */}
              <header className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${themeStyles.badge}`}>
                    Day {parsed.meta.day_number || '01'}
                  </span>
                  {parsed.meta.topic && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${themeStyles.badge}`}>
                      {parsed.meta.topic}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-xs ${themeStyles.textMuted}`}>
                    <Clock className="w-3.5 h-3.5" />
                    ~5 min revision
                  </span>
                  <span className={`text-xs ${themeStyles.textMuted}`}>•</span>
                  <span className={`text-xs ${themeStyles.textMuted}`}>
                    {parsed.concepts.length} Core Concepts
                  </span>
                </div>

                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${themeStyles.textHeading}`}>
                  {parsed.title}
                </h1>

                {/* The Goal Card */}
                {parsed.goal && (
                  <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${themeStyles.goalBg}`}>
                    <div className="p-2 rounded-xl bg-emerald-600 text-white mt-0.5 shadow-xs">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Action Goal
                      </div>
                      <p className={`text-sm sm:text-base font-medium ${themeStyles.textHeading}`}>
                        {parsed.goal}
                      </p>
                      {parsed.prerequisites && (
                        <div className={`text-xs mt-1.5 ${themeStyles.textMuted}`}>
                          <span className="font-semibold">Prerequisites:</span> {parsed.prerequisites}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Concept Navigator Pills */}
                {parsed.concepts.length > 0 && (
                  <nav aria-label="Concept Navigation" className="pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                      Jump to Concept:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsed.concepts.map((c) => (
                        <a
                          key={c.index}
                          href={`#concept-${c.index}`}
                          className={`px-3 py-1 rounded-xl text-xs font-medium border transition ${themeStyles.accentBg} ${themeStyles.accentBorder} ${themeStyles.cardHover} ${themeStyles.textMuted}`}
                        >
                          <span className={`font-bold mr-1.5 ${themeStyles.jumpPillActive}`}>
                            {String(c.index).padStart(2, '0')}
                          </span>
                          {c.name}
                        </a>
                      ))}
                    </div>
                  </nav>
                )}
              </header>

              <div className={`h-px w-full ${themeStyles.accentBorder} border-t`} />

              {/* Concepts List */}
              <section className="space-y-8">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Lightbulb className="w-4 h-4" />
                  </span>
                  <h2 className={`text-lg font-bold tracking-tight ${themeStyles.textHeading}`}>
                    Important Concepts & Mental Models
                  </h2>
                </div>

                <div className="space-y-8">
                  {parsed.concepts.map((concept) => (
                    <article
                      key={concept.index}
                      id={`concept-${concept.index}`}
                      className={`p-6 sm:p-7 rounded-3xl border transition space-y-5 scroll-mt-20 ${themeStyles.card} ${themeStyles.cardHover}`}
                    >
                      {/* Concept Title */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className={`flex-shrink-0 w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center ${themeStyles.badge}`}>
                            {String(concept.index).padStart(2, '0')}
                          </span>
                          <h3 className={`text-lg sm:text-xl font-bold tracking-tight ${themeStyles.textHeading}`}>
                            {concept.name}
                          </h3>
                        </div>
                      </div>

                      {/* 1. Definition */}
                      {concept.definition && (
                        <div className="space-y-1">
                          <div className={`text-xs font-semibold uppercase tracking-wider ${themeStyles.textMuted}`}>
                            Definition in Simple Words
                          </div>
                          <p className={`text-sm sm:text-base leading-relaxed ${themeStyles.textHeading}`}>
                            {concept.definition}
                          </p>
                        </div>
                      )}

                      {/* 2. Mental Model (Analogy Box) */}
                      {concept.analogy && (
                        <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 relative overflow-hidden ${themeStyles.analogyBg}`}>
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${themeStyles.analogyBadge}`}>
                              <Lightbulb className="w-3.5 h-3.5" />
                              The Mental Model (Intuition First)
                            </span>
                          </div>
                          <p className="text-sm sm:text-base italic font-medium leading-relaxed">
                            "{concept.analogy}"
                          </p>
                        </div>
                      )}

                      {/* 3. Who Does the Work & Data Flow */}
                      {concept.whoDoesWork && (
                        <div className={`p-4 rounded-2xl border space-y-1.5 ${themeStyles.flowBg}`}>
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Who Does the Work & Data Flow
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium leading-relaxed">
                            {concept.whoDoesWork}
                          </p>
                        </div>
                      )}

                      {/* 4. Instructor's Example */}
                      {concept.videoExample && (
                        <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm space-y-1 ${themeStyles.exampleBg}`}>
                          <div className="font-semibold flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5" />
                            <span>Instructor's Exact Walkthrough:</span>
                          </div>
                          <p className="italic">{concept.videoExample}</p>
                        </div>
                      )}

                      {/* 5. Why It Matters in Production */}
                      {concept.whyItMatters && (
                        <div className="text-xs sm:text-sm space-y-1">
                          <span className={`font-semibold ${themeStyles.textHeading}`}>Why it matters: </span>
                          <span className={themeStyles.textMuted}>{concept.whyItMatters}</span>
                        </div>
                      )}

                      {/* 6. Gotchas & Production/Safety Risk */}
                      {(concept.gotchas.length > 0 || concept.productionGotcha) && (
                        <div className="space-y-2 pt-1">
                          <div className="text-xs font-semibold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Gotchas & Traps</span>
                          </div>
                          <ul className="space-y-1.5 text-xs sm:text-sm">
                            {concept.gotchas.map((g, gIdx) => (
                              <li key={gIdx} className={`flex items-start gap-2 ${themeStyles.textMuted}`}>
                                <span className="text-emerald-500 mt-1">•</span>
                                <span>{g}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Critical Production/Safety Alert */}
                          {concept.productionGotcha && (
                            <div className={`mt-2 p-3.5 rounded-xl border flex items-start gap-2.5 ${themeStyles.dangerBg}`}>
                              <span className="text-base flex-shrink-0">🚨</span>
                              <div className="space-y-0.5 text-xs sm:text-sm">
                                <span className="font-bold">Production & Safety Gotcha:</span>
                                <p className="leading-relaxed">{concept.productionGotcha}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 7. Interview Questions (Active-Recall Cards) */}
                      {concept.interviewQuestions.length > 0 && (
                        <div className="pt-2 space-y-3">
                          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Interview Questions ({concept.interviewQuestions.length})</span>
                          </div>

                          <div className="space-y-2.5">
                            {concept.interviewQuestions.map((iq, qIdx) => {
                              const qKey = `${concept.index}-${qIdx}`;
                              const isRevealed = revealedAnswers[qKey] || allAnswersRevealed;

                              return (
                                <div
                                  key={qIdx}
                                  className={`p-3.5 sm:p-4 rounded-2xl border transition ${themeStyles.accentBg} ${themeStyles.accentBorder}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold ${themeStyles.jumpPillActive}`}>
                                          Q{qIdx + 1}
                                        </span>
                                        {iq.isExtra && (
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                                            (Extra)
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-xs sm:text-sm font-semibold ${themeStyles.textHeading}`}>
                                        {iq.question}
                                      </p>
                                    </div>

                                    <button
                                      onClick={() => toggleAnswer(qKey)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                      title={isRevealed ? 'Hide Answer' : 'Reveal Answer'}
                                    >
                                      {isRevealed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </div>

                                  {isRevealed ? (
                                    <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 space-y-1">
                                      <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                                        Model Answer:
                                      </span>
                                      <p className={`text-xs sm:text-sm leading-relaxed ${themeStyles.textMuted}`}>
                                        {iq.answer}
                                      </p>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => toggleAnswer(qKey)}
                                      className={`mt-2 text-xs font-medium hover:underline flex items-center gap-1 ${themeStyles.activeRecallText}`}
                                    >
                                      <span>Tap to test your recall</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              {/* How Concepts Connect (Mental Map) */}
              {parsed.howConceptsConnect && (
                <section className={`p-6 sm:p-7 rounded-3xl border space-y-3 ${themeStyles.card}`}>
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Layers className="w-4 h-4" />
                    </span>
                    <h2 className={`text-base sm:text-lg font-bold tracking-tight ${themeStyles.textHeading}`}>
                      How the Concepts Connect
                    </h2>
                  </div>
                  <div className={`text-sm sm:text-base leading-relaxed ${themeStyles.textMuted} whitespace-pre-line`}>
                    {parsed.howConceptsConnect}
                  </div>
                </section>
              )}

              {/* Minimal Working Code Snippet */}
              {parsed.code && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-emerald-500" />
                      <h2 className={`text-base sm:text-lg font-bold tracking-tight ${themeStyles.textHeading}`}>
                        Complete Minimal Working Example
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(parsed.code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Code</span>
                    </button>
                  </div>

                  <div className={`rounded-2xl p-4 sm:p-5 font-mono text-xs overflow-x-auto shadow-inner ${themeStyles.codeBg}`}>
                    <pre className="text-emerald-300">
                      <code>{parsed.code}</code>
                    </pre>
                  </div>
                </section>
              )}

              {/* Summary & Practice Challenge */}
              <footer className={`p-6 sm:p-7 rounded-3xl border space-y-5 ${themeStyles.card}`}>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <h2 className={`text-base sm:text-lg font-bold tracking-tight ${themeStyles.textHeading}`}>
                    Summary & Application
                  </h2>
                </div>

                {parsed.summary && (
                  <div className="space-y-1">
                    <div className={`text-xs font-semibold uppercase tracking-wider ${themeStyles.textMuted}`}>
                      In Plain Words:
                    </div>
                    <p className={`text-sm sm:text-base leading-relaxed ${themeStyles.textHeading}`}>
                      {parsed.summary}
                    </p>
                  </div>
                )}

                {parsed.practiceTask && (
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${themeStyles.exampleBg}`}>
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>🚀 Hands-On Practice Project</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">
                      {parsed.practiceTask}
                    </p>
                  </div>
                )}

                {parsed.openDoubts.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className={`text-xs font-semibold uppercase tracking-wider ${themeStyles.textMuted}`}>
                      Open Doubts & Worth Looking Up:
                    </div>
                    <ul className="space-y-1 text-xs sm:text-sm">
                      {parsed.openDoubts.map((doubt, dIdx) => (
                        <li key={dIdx} className={`flex items-start gap-2 ${themeStyles.textMuted}`}>
                          <span className="text-emerald-500 mt-1">•</span>
                          <span>{doubt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </footer>
            </>
          ) : (
            /* Fallback Markdown Viewer for Non-Teacher Notes (INDEX.md, GLOSSARY.md) */
            <div className={`prose prose-sm sm:prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold pb-2 mb-4 border-b border-black/10 dark:border-white/10" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-6 mb-3 text-emerald-600 dark:text-emerald-400" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-6 rounded-xl border border-black/10 dark:border-white/10">
                      <table className="w-full text-left text-xs border-collapse" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => <th className="p-3 bg-black/5 dark:bg-white/5 font-semibold" {...props} />,
                  td: ({ node, ...props }) => <td className="p-3 border-t border-black/5 dark:border-white/5 align-top" {...props} />,
                  blockquote: ({ node, children, ...props }) => (
                    <div className="my-5 p-4 rounded-2xl border-l-4 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/5 text-slate-800 dark:text-slate-200 text-sm space-y-1.5 shadow-xs" {...props}>
                      {children}
                    </div>
                  ),
                  code: ({ node, inline, children, ...props }) => {
                    return inline ? (
                      <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-xs text-emerald-700 dark:text-emerald-300" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="block p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Active-Recall Flashcard Modal */}
      <FlashcardModal
        isOpen={flashcardsOpen}
        onClose={() => setFlashcardsOpen(false)}
        cards={flashcards}
      />
    </div>
  );
}

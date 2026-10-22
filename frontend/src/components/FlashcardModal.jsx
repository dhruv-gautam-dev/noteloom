import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';

export default function FlashcardModal({ isOpen, onClose, cards = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (!isOpen || cards.length === 0) return null;

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Active Recall Flashcards</h3>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Card {currentIndex + 1} of {cards.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Content Area */}
        <div
          onClick={() => setShowAnswer(!showAnswer)}
          className="my-6 min-h-[220px] rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 p-8 flex flex-col justify-center items-center text-center cursor-pointer hover:border-indigo-500/50 transition-all select-none shadow-inner"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
            {showAnswer ? 'Answer' : 'Question (Click to reveal)'}
          </span>
          <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed max-w-md">
            {showAnswer ? currentCard.back : currentCard.front}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium text-indigo-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{showAnswer ? 'Hide Answer' : 'Flip Card'}</span>
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition shadow-sm"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


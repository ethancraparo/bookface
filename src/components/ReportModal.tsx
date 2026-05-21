'use client';
import { useState } from 'react';
import { ReportCategory } from '@/types';

const CATEGORIES: { value: ReportCategory; label: string; desc: string }[] = [
  {
    value: 'INAPPROPRIATE_CONTENT',
    label: 'Inappropriate content',
    desc: 'Nudity, sexual content, or disturbing material',
  },
  {
    value: 'HARASSMENT',
    label: 'Harassment',
    desc: 'Bullying, threats, or targeted abuse',
  },
  {
    value: 'SPAM',
    label: 'Spam / bot',
    desc: 'Automated behavior or repeated irrelevant content',
  },
];

interface Props {
  onReport: (category: ReportCategory) => void;
  onClose: () => void;
}

export default function ReportModal({ onReport, onClose }: Props) {
  const [selected, setSelected] = useState<ReportCategory | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in p-4">
      <div className="glass-heavy rounded-3xl p-6 w-full max-w-sm shadow-glass-lg animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-danger/15 border border-danger/25 flex items-center justify-center">
              <svg className="w-4 h-4 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </div>
            <h3 className="font-semibold text-white text-[15px]">Report user</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="text-white/50 text-sm mb-4 leading-relaxed">
          Select a reason. This will end the session and block this user from matching with you again.
        </p>

        <div className="space-y-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelected(cat.value)}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                selected === cat.value
                  ? 'border-danger/60 bg-danger/10'
                  : 'glass hover:border-white/20'
              }`}
            >
              <div className="text-sm font-medium text-white">{cat.label}</div>
              <div className="text-xs text-white/40 mt-0.5">{cat.desc}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl glass text-white/70 hover:text-white font-medium text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onReport(selected)}
            disabled={!selected}
            className="flex-1 py-3 rounded-2xl bg-danger text-white font-semibold text-sm hover:bg-red-600 transition-all disabled:opacity-30"
          >
            Report
          </button>
        </div>
      </div>
    </div>
  );
}

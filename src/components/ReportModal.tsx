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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Report user</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text-muted transition-colors">
            ✕
          </button>
        </div>

        <p className="text-text-muted text-sm mb-4">
          Select a reason. This will end the session and block this user from matching with you again.
        </p>

        <div className="space-y-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelected(cat.value)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selected === cat.value
                  ? 'border-danger bg-danger/10'
                  : 'border-border hover:border-text-dim'
              }`}
            >
              <div className="text-sm font-medium text-text-primary">{cat.label}</div>
              <div className="text-xs text-text-muted mt-0.5">{cat.desc}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-text-muted hover:bg-elevated transition-colors text-sm"
          >
            cancel
          </button>
          <button
            onClick={() => selected && onReport(selected)}
            disabled={!selected}
            className="flex-1 py-2.5 rounded-lg bg-danger text-white font-semibold hover:bg-red-600 transition-colors text-sm disabled:opacity-40"
          >
            report & end session
          </button>
        </div>
      </div>
    </div>
  );
}

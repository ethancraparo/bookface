'use client';
import { useEffect, useState } from 'react';

const STATUS_MSGS = [
  'Looking for someone to connect with…',
  'Scanning the queue…',
  'Finding your match…',
  'Almost there…',
  'Still searching…',
  'Good things take time…',
];

interface Props {
  onCancel: () => void;
  selectedTags: string[];
}

export default function WaitingScreen({ onCancel, selectedTags }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (elapsed > 0 && elapsed % 5 === 0) {
      setMsgIdx((i) => (i + 1) % STATUS_MSGS.length);
    }
  }, [elapsed]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `0:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
      {/* Animated rings */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-green/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-3 rounded-full border border-green/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
        <div className="absolute inset-6 rounded-full border border-green/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.6s' }} />
        <div className="w-10 h-10 rounded-full bg-green/90 shadow-green-glow flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>

      {/* Glass status card */}
      <div className="glass rounded-3xl p-6 w-full max-w-sm shadow-glass-lg text-center space-y-3">
        <p className="text-white font-medium text-[15px] leading-snug animate-fade-in" key={msgIdx}>
          {STATUS_MSGS[msgIdx]}
        </p>

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-green/15 text-green border border-green/25 font-mono"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-white/30 text-sm font-mono tabular-nums">{timeStr}</p>
      </div>

      <button
        onClick={onCancel}
        className="text-sm text-white/40 hover:text-white/80 transition-colors px-4 py-2 rounded-xl hover:bg-white/5"
      >
        Cancel
      </button>
    </div>
  );
}

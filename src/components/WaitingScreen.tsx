'use client';
import { useEffect, useState } from 'react';

const SCAN_MESSAGES = [
  '> scanning for vibe coders...',
  '> checking the queue...',
  '> looking for a match...',
  '> almost there...',
  '> still searching...',
  '> good things take time...',
];

interface Props {
  onCancel: () => void;
  selectedTags: string[];
}

export default function WaitingScreen({ onCancel, selectedTags }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (elapsed > 0 && elapsed % 6 === 0) {
      setMsgIdx((i) => (i + 1) % SCAN_MESSAGES.length);
    }
  }, [elapsed]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
      {/* Pulsing ring */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-green opacity-20 animate-ping" />
        <div className="absolute inset-2 rounded-full border border-green opacity-40 animate-pulse-slow" />
        <div className="w-10 h-10 rounded-full bg-green opacity-80 animate-pulse" />
      </div>

      {/* Terminal output */}
      <div className="bg-surface border border-border rounded-xl p-5 w-full max-w-sm font-mono text-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-text-dim text-xs">bookface-matcher</span>
        </div>
        <p className="text-green">
          {SCAN_MESSAGES[msgIdx]}
          <span className="animate-blink">{dots || ' '}</span>
        </p>
        {selectedTags.length > 0 && (
          <p className="text-text-muted mt-2 text-xs">
            {'> tags: '}
            {selectedTags.join(', ')}
          </p>
        )}
        <p className="text-text-dim mt-2 text-xs">{`> elapsed: ${elapsed}s`}</p>
      </div>

      <button
        onClick={onCancel}
        className="text-sm text-text-muted hover:text-danger transition-colors font-mono border border-border hover:border-danger rounded-lg px-4 py-2"
      >
        cancel search
      </button>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { INTEREST_TAGS } from '@/types';

const TERMINAL_LINES = [
  '> initializing bookface...',
  '> scanning for vibe coders...',
  '> found: 1 react dev in SF',
  '> found: 1 rust enthusiast in Berlin',
  '> found: 1 AI hacker in Tokyo',
  '> matching...',
  '> connection established ✓',
];

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [termLine, setTermLine] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (termLine >= TERMINAL_LINES.length) return;
    const line = TERMINAL_LINES[termLine];
    if (charIdx < line.length) {
      const t = setTimeout(() => {
        setDisplayedText((prev) => prev + line[charIdx]);
        setCharIdx((c) => c + 1);
      }, 28);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDisplayedText((prev) => prev + '\n');
        setTermLine((l) => l + 1);
        setCharIdx(0);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [termLine, charIdx]);

  function handleStart() {
    router.push(session ? '/match' : '/auth/signin');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 glass border-b border-white/[0.08]">
        <span className="text-lg font-bold text-white tracking-tight">bookface</span>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Link href="/profile" className="text-sm text-white/50 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all">
                Profile
              </Link>
              <button
                onClick={handleStart}
                className="bg-green text-white text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-green-dim transition-all"
              >
                Enter →
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="text-sm text-white/50 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all">
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="bg-green text-white text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-green-dim transition-all shadow-green-glow"
              >
                Get started →
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl w-full space-y-10">
          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-white">
              book<span className="text-green">face</span>
            </h1>
            <p className="text-white/50 text-lg">
              Random video chat for vibe coders
            </p>
          </div>

          {/* Terminal — glass card */}
          <div className="glass rounded-3xl p-5 text-left font-mono text-sm shadow-glass">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-3 h-3 rounded-full bg-danger/70" />
              <div className="w-3 h-3 rounded-full bg-yellow/70" />
              <div className="w-3 h-3 rounded-full bg-green/70" />
              <span className="ml-2 text-white/25 text-xs">bookface — terminal</span>
            </div>
            <pre className="text-green/90 whitespace-pre-wrap min-h-[9rem] text-[13px] leading-relaxed">
              {displayedText}
              {termLine < TERMINAL_LINES.length && (
                <span className="animate-blink opacity-80">█</span>
              )}
            </pre>
          </div>

          {/* CTA */}
          <button
            onClick={handleStart}
            className="w-full sm:w-auto bg-green text-white font-bold px-12 py-4 rounded-2xl text-lg hover:bg-green-dim transition-all hover:scale-[1.02] active:scale-[0.98] shadow-green-glow"
          >
            Start matching →
          </button>

          {/* Interest tags preview */}
          <div className="flex flex-wrap justify-center gap-2">
            {INTEREST_TAGS.slice(0, 12).map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono text-white/35 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1 hover:border-white/15 hover:text-white/60 transition-all cursor-default"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              { icon: '📹', title: 'Video first', desc: 'Real camera, real audio, real vibes' },
              { icon: '🎲', title: 'Random match', desc: 'Next available dev, or filter by stack' },
              { icon: '🔒', title: 'Anonymous', desc: 'Identity only revealed when you both agree' },
            ].map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5 text-left hover:bg-white/[0.09] transition-all">
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="font-semibold text-sm text-white mb-1">{f.title}</div>
                <div className="text-xs text-white/40 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/[0.06] text-center">
        <p className="text-xs text-white/20 font-mono">
          vibe responsibly · anonymous until you choose otherwise
        </p>
      </footer>
    </div>
  );
}

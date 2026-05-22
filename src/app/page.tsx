'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeSelector from '@/components/ThemeSelector';

const TERMINAL_LINES = [
  '> initializing bookface...',
  '> scanning for vibe coders...',
  '> found: 1 react dev in SF',
  '> found: 1 rust enthusiast in Berlin',
  '> found: 1 AI hacker in Tokyo',
  '> matching...',
  '> connection established ✓',
];

function VideoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
      <rect x="2" y="8" width="20" height="16" rx="3.5"/>
      <path d="M22 13l8-4v14l-8-4V13z"/>
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
      <rect x="3" y="3" width="26" height="26" rx="5"/>
      <circle cx="10" cy="10" r="1.5" fill="white" stroke="none"/>
      <circle cx="22" cy="10" r="1.5" fill="white" stroke="none"/>
      <circle cx="10" cy="22" r="1.5" fill="white" stroke="none"/>
      <circle cx="22" cy="22" r="1.5" fill="white" stroke="none"/>
      <circle cx="16" cy="16" r="1.5" fill="white" stroke="none"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
      <rect x="6" y="14" width="20" height="14" rx="4"/>
      <path d="M10 14v-4a6 6 0 0 1 12 0v4"/>
      <circle cx="16" cy="21" r="1.5" fill="white" stroke="none"/>
      <line x1="16" y1="21" x2="16" y2="24" strokeWidth="2"/>
    </svg>
  );
}

export default function LandingPage() {
  const { data: rawSession, status } = useSession();
  // In dev bypass mode the landing page should always look logged-out
  const session = process.env.NEXT_PUBLIC_DEV_BYPASS === '1' ? null : rawSession;
  const router = useRouter();
  const [termLine, setTermLine] = useState(0);

  // Already signed in — skip the landing page entirely
  // (Skip in dev bypass mode so the landing page is previewable locally)
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_BYPASS === '1') return;
    if (status === 'authenticated') router.replace('/match');
  }, [status, router]);
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
    router.push(session ? '/match' : '/auth/signup');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-3 glass border-b border-white/[0.08]">
        <span className="text-base font-bold tracking-tight text-white">book<span className="text-green">face</span></span>
        <div className="flex items-center gap-2">
          <ThemeSelector />
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

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              { icon: <VideoIcon />, title: 'Video first', desc: 'Real camera, real audio, real vibes' },
              { icon: <DiceIcon />, title: 'Random match', desc: 'Next available dev, or filter by stack' },
              { icon: <LockIcon />, title: 'Anonymous', desc: 'Identity only revealed when you both agree' },
            ].map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5 text-center hover:bg-white/[0.09] transition-all">
                <div className="flex justify-center mb-3">{f.icon}</div>
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

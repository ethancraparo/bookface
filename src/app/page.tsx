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

  // Typewriter effect
  useEffect(() => {
    if (termLine >= TERMINAL_LINES.length) return;
    const line = TERMINAL_LINES[termLine];

    if (charIdx < line.length) {
      const t = setTimeout(() => {
        setDisplayedText((prev) => prev + line[charIdx]);
        setCharIdx((c) => c + 1);
      }, 30);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDisplayedText((prev) => prev + '\n');
        setTermLine((l) => l + 1);
        setCharIdx(0);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [termLine, charIdx]);

  function handleStart() {
    if (session) {
      router.push('/match');
    } else {
      router.push('/auth/signin');
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="font-mono text-lg font-bold text-green">bookface</span>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                href="/profile"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                profile
              </Link>
              <button
                onClick={handleStart}
                className="bg-green text-base text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-green-dim transition-colors"
              >
                enter →
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                sign in
              </Link>
              <Link
                href="/auth/signup"
                className="bg-green text-base text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-green-dim transition-colors"
              >
                get started →
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl w-full space-y-8">
          {/* Title */}
          <div>
            <h1 className="font-mono text-6xl sm:text-7xl font-black tracking-tight">
              <span className="text-green">book</span>
              <span className="text-text-primary">face</span>
            </h1>
            <p className="mt-4 text-text-muted text-lg">
              random video chat for vibe coders
            </p>
          </div>

          {/* Terminal */}
          <div className="bg-surface border border-border rounded-xl p-5 text-left font-mono text-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-danger opacity-80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
              <div className="w-3 h-3 rounded-full bg-green opacity-80" />
            </div>
            <pre className="text-green whitespace-pre-wrap min-h-[9rem]">
              {displayedText}
              {termLine < TERMINAL_LINES.length && (
                <span className="animate-blink">█</span>
              )}
            </pre>
          </div>

          {/* CTA */}
          <button
            onClick={handleStart}
            className="w-full sm:w-auto bg-green text-base font-bold px-10 py-3.5 rounded-xl text-lg hover:bg-green-dim transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_#22c55e33]"
          >
            start matching →
          </button>

          {/* Tags */}
          <div className="flex flex-wrap justify-center gap-2">
            {INTEREST_TAGS.slice(0, 12).map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono text-text-muted border border-border rounded-full px-3 py-1 hover:border-green hover:text-green transition-colors cursor-default"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {[
              { icon: '📹', title: 'video first', desc: 'real camera, real audio, real vibes' },
              { icon: '🎲', title: 'random match', desc: 'next available dev, or filter by stack' },
              { icon: '🔒', title: 'anonymous', desc: 'identity only revealed when you both agree' },
            ].map((f) => (
              <div key={f.title} className="bg-surface border border-border rounded-lg p-4 text-left">
                <div className="text-xl mb-2">{f.icon}</div>
                <div className="font-mono text-sm font-semibold text-text-primary mb-1">{f.title}</div>
                <div className="text-xs text-text-muted">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-border text-center">
        <p className="text-xs text-text-dim font-mono">
          vibe responsibly · anonymous until you choose otherwise
        </p>
      </footer>
    </div>
  );
}

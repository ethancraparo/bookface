'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      setLoading(false);
      return;
    }
    await signIn('credentials', { email, password, callbackUrl: '/profile' });
  }

  async function handleGitHub() {
    await signIn('github', { callbackUrl: '/profile' });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">bookface</h1>
          <p className="text-white/40 mt-1 text-sm">Create your account</p>
        </div>

        <div className="glass rounded-3xl p-6 shadow-glass-lg space-y-4">
          <button
            onClick={handleGitHub}
            className="w-full flex items-center justify-center gap-2.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm font-medium text-white transition-all"
          >
            <GithubIcon />
            Sign up with GitHub
            <span className="ml-auto text-xs text-green font-mono">verified dev ✓</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-white/[0.08]" />
            <span className="text-white/25 text-xs">or</span>
            <div className="flex-1 border-t border-white/[0.08]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/60 transition-all"
            />
            <input
              type="password"
              placeholder="Password (8+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/60 transition-all"
            />
            {error && <p className="text-danger text-xs px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green text-white font-semibold rounded-2xl px-4 py-3 text-sm hover:bg-green-dim transition-all disabled:opacity-50 shadow-green-glow mt-1"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-white/35 text-xs pt-1">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-green hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

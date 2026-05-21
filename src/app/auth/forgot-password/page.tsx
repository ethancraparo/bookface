'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Small delay to feel real — email service can be wired in here later
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
            book<span className="text-green">face</span>
          </Link>
          <p className="text-white/40 mt-1 text-sm">Reset your password</p>
        </div>

        <div className="glass rounded-3xl p-6 shadow-glass-lg">
          {submitted ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-2xl bg-green/15 border border-green/25 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Check your email</p>
                <p className="text-white/40 text-sm mt-1">
                  If <span className="text-white/70">{email}</span> has an account, a reset link is on its way.
                </p>
              </div>
              <Link
                href="/auth/signin"
                className="inline-block text-sm text-green hover:underline mt-2"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-white/50 text-sm">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/60 transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green text-white font-semibold rounded-2xl px-4 py-3 text-sm hover:bg-green-dim transition-all disabled:opacity-50 shadow-green-glow"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <div className="text-center">
                <Link href="/auth/signin" className="text-sm text-white/35 hover:text-white/70 transition-colors">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function validate(password: string) {
  return {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [touched, setTouched]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const rules = validate(password);
  const allRulesPass = rules.length && rules.uppercase && rules.special;
  const passwordsMatch = password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!allRulesPass || !passwordsMatch) return;
    setLoading(true);
    setError('');

    // TODO: wire to POST /api/auth/reset-password with { token, password }
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setDone(true);
  }

  // Invalid / missing token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-fade-in text-center space-y-4">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
            book<span className="text-green">face</span>
          </Link>
          <div className="glass rounded-3xl p-8 shadow-glass-lg space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-danger/15 border border-danger/25 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Invalid reset link</p>
              <p className="text-white/40 text-sm mt-1">This link is missing or has expired.</p>
            </div>
            <Link href="/auth/forgot-password" className="inline-block text-sm text-green hover:underline">
              Request a new one →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-fade-in text-center space-y-4">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
            book<span className="text-green">face</span>
          </Link>
          <div className="glass rounded-3xl p-8 shadow-glass-lg space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-green/15 border border-green/25 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Password updated</p>
              <p className="text-white/40 text-sm mt-1">You can now sign in with your new password.</p>
            </div>
            <Link href="/auth/signin" className="inline-block text-sm text-green hover:underline">
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
            book<span className="text-green">face</span>
          </Link>
          <p className="text-white/40 mt-1 text-sm">Choose a new password</p>
        </div>

        <div className="glass rounded-3xl p-6 shadow-glass-lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
              required
              className={`w-full bg-white/[0.06] border rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all ${
                touched && !allRulesPass ? 'border-danger/50 focus:border-danger/80' : 'border-white/[0.1] focus:border-green/60'
              }`}
            />

            {touched && (
              <div className="grid grid-cols-3 gap-1.5 px-1">
                <Req met={rules.length}    label="8+ chars" />
                <Req met={rules.uppercase} label="Uppercase" />
                <Req met={rules.special}   label="Special char" />
              </div>
            )}

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={`w-full bg-white/[0.06] border rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all ${
                confirm && !passwordsMatch ? 'border-danger/50 focus:border-danger/80' : 'border-white/[0.1] focus:border-green/60'
              }`}
            />
            {confirm && !passwordsMatch && (
              <p className="text-danger text-xs px-1">Passwords don't match</p>
            )}

            {error && <p className="text-danger text-xs px-1">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green text-white font-semibold rounded-2xl px-4 py-3 text-sm hover:bg-green-dim transition-all disabled:opacity-50 shadow-green-glow mt-1"
            >
              {loading ? 'Updating…' : 'Set new password'}
            </button>

            <div className="text-center pt-1">
              <Link href="/auth/signin" className="text-sm text-white/35 hover:text-white/70 transition-colors">
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Req({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1 text-[11px] transition-colors ${met ? 'text-green' : 'text-white/30'}`}>
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {met
          ? <polyline points="20 6 9 17 4 12" />
          : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
        }
      </svg>
      {label}
    </div>
  );
}

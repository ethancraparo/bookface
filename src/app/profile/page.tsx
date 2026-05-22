'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TagSelector from '@/components/TagSelector';
import ThemeSelector from '@/components/ThemeSelector';

function Toggle({ enabled, onChange, label, hint }: {
  enabled: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-sm text-white/70">{label}</div>
        {hint && <div className="text-xs text-white/30 mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-green' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [handle, setHandle]             = useState('');
  const [bio, setBio]                   = useState('');
  const [githubUrl, setGithubUrl]       = useState('');
  const [twitterUrl, setTwitterUrl]     = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [tags, setTags]                 = useState<string[]>([]);
  const [isGithubLinked, setIsGithubLinked] = useState(false);

  const [revealHandle,  setRevealHandle]  = useState(true);
  const [revealBio,     setRevealBio]     = useState(true);
  const [revealGithub,  setRevealGithub]  = useState(true);
  const [revealTwitter, setRevealTwitter] = useState(true);
  const [revealEmail,   setRevealEmail]   = useState(true);

  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setHandle(data.handle ?? '');
        setBio(data.bio ?? '');
        setGithubUrl(data.githubUrl ?? '');
        setTwitterUrl(data.twitterUrl ?? '');
        setContactEmail(data.contactEmail ?? '');
        setTags(data.tags ?? []);
        setIsGithubLinked(data.isGithubLinked ?? false);
        setRevealHandle(data.revealHandle ?? true);
        setRevealBio(data.revealBio ?? true);
        setRevealGithub(data.revealGithub ?? true);
        setRevealTwitter(data.revealTwitter ?? true);
        setRevealEmail(data.revealEmail ?? true);
      });
  }, [status]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle, bio, githubUrl, twitterUrl, contactEmail, tags,
        revealHandle, revealBio, revealGithub, revealTwitter, revealEmail,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? 'Failed to save');
    else setSuccess(true);
    setLoading(false);
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Nav ── */}
      <header className="flex items-center justify-between px-6 py-3 glass border-b border-white/[0.08] shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-bold tracking-tight text-white">
            book<span className="text-green">face</span>
          </Link>
          <span className="text-white/20 text-sm">/</span>
          <span className="text-white/50 text-sm">Profile</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSelector />
          <Link
            href="/match"
            className="text-sm text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5"
          >
            Match →
          </Link>
        </div>
      </header>

      {/* ── Content ── */}
      <form onSubmit={handleSave} className="flex-1 flex flex-col">
        <div className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto">

            {/* Page title row */}
            <div className="flex items-baseline justify-between mb-7">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Your profile</h1>
                <p className="text-white/35 text-sm mt-1">Edit what others see when you reveal your identity.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/30">
                <span className="font-mono">{session?.user?.email}</span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-danger/70 hover:text-danger transition-colors ml-1"
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* ── Two-column grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* ── LEFT column ── */}
              <div className="space-y-5">

                {/* Identity */}
                <section className="glass rounded-3xl p-6 shadow-glass space-y-5">
                  <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">Identity</h2>

                  <Field label="Handle *">
                    <div className="flex items-center bg-white/[0.06] border border-white/[0.1] rounded-2xl overflow-hidden focus-within:border-green/60 transition-all">
                      <span className="px-4 text-white/30 font-mono text-sm select-none">@</span>
                      <input
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="your_handle"
                        required
                        maxLength={30}
                        pattern="[a-zA-Z0-9_]+"
                        className="flex-1 bg-transparent py-3 pr-4 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <p className="text-white/25 text-xs font-mono mt-1 px-1">letters, numbers, underscores only</p>
                  </Field>

                  <Field label="Bio">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="What are you building? What's your vibe?"
                      maxLength={200}
                      rows={4}
                      className={`${inputCls} resize-none`}
                    />
                    <p className="text-white/20 text-xs font-mono mt-1 px-1 text-right">{bio.length}/200</p>
                  </Field>
                </section>

                {/* Links */}
                <section className="glass rounded-3xl p-6 shadow-glass space-y-5">
                  <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">Links</h2>

                  <Field label="GitHub">
                    {isGithubLinked && <span className="text-green text-xs">● linked via OAuth</span>}
                    <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/you" type="url" className={inputCls} />
                  </Field>

                  <Field label="Twitter / X">
                    <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://x.com/you" type="url" className={inputCls} />
                  </Field>

                  <Field label="Contact email">
                    <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@example.com" type="email" className={inputCls} />
                  </Field>
                </section>

              </div>

              {/* ── RIGHT column ── */}
              <div className="space-y-5">

                {/* Reveal settings */}
                <section className="glass rounded-3xl p-6 shadow-glass space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">Reveal settings</h2>
                    <p className="text-white/30 text-xs mt-1.5 leading-relaxed">
                      Choose what gets shared when you both agree to connect.
                    </p>
                  </div>
                  <div className="divide-y divide-white/[0.06] space-y-1">
                    <Toggle enabled={revealHandle}  onChange={setRevealHandle}  label="Handle"        hint="Your @username" />
                    <Toggle enabled={revealBio}     onChange={setRevealBio}     label="Bio"           hint="Your intro text" />
                    <Toggle enabled={revealGithub}  onChange={setRevealGithub}  label="GitHub"        hint="Your GitHub profile URL" />
                    <Toggle enabled={revealTwitter} onChange={setRevealTwitter} label="Twitter / X"   hint="Your X profile URL" />
                    <Toggle enabled={revealEmail}   onChange={setRevealEmail}   label="Contact email" hint="Your email address" />
                  </div>
                </section>

                {/* Interests */}
                <section className="glass rounded-3xl p-6 shadow-glass space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">Interests</h2>
                    <p className="text-white/30 text-xs mt-1.5">Used for smarter matching — not revealed to others.</p>
                  </div>
                  <TagSelector selected={tags} onChange={setTags} />
                </section>

              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky save bar ── */}
        <div className="sticky bottom-0 glass border-t border-white/[0.08] px-6 py-4 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              {error && (
                <p className="text-danger text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </p>
              )}
              {success && (
                <p className="text-green text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Profile saved
                </p>
              )}
              {!error && !success && (
                <p className="text-white/25 text-xs">Changes are saved to your account.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green text-white font-semibold rounded-2xl px-8 py-2.5 text-sm hover:bg-green-dim transition-all disabled:opacity-50 shadow-green-glow shrink-0"
            >
              {loading ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}

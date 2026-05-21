'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TagSelector from '@/components/TagSelector';

function Toggle({ enabled, onChange, label, hint }: { enabled: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm text-white/70">{label}</div>
        {hint && <div className="text-xs text-white/30 mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-green' : 'bg-white/10'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

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
    <div className="min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto animate-fade-in space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              book<span className="text-green">face</span>
            </Link>
            <p className="text-white/35 text-sm mt-0.5">Your profile</p>
          </div>
          <button
            onClick={() => router.push('/match')}
            className="text-sm text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5"
          >
            Match →
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* ── Identity ── */}
          <section className="glass rounded-3xl p-6 shadow-glass space-y-4">
            <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">Identity</h2>

            {/* Handle */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Handle <span className="text-danger">*</span>
              </label>
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
              <p className="text-white/25 text-xs font-mono mt-1.5 px-1">letters, numbers, underscores only</p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What are you building? What's your vibe?"
                maxLength={200}
                rows={3}
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all resize-none"
              />
              <p className="text-white/20 text-xs font-mono mt-1 px-1 text-right">{bio.length}/200</p>
            </div>
          </section>

          {/* ── Links ── */}
          <section className="glass rounded-3xl p-6 shadow-glass space-y-4">
            <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">Links</h2>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                GitHub
                {isGithubLinked && <span className="ml-2 text-green text-xs font-normal">● linked via OAuth</span>}
              </label>
              <input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/you"
                type="url"
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Twitter / X</label>
              <input
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://x.com/you"
                type="url"
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Contact email</label>
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all"
              />
            </div>
          </section>

          {/* ── Interests ── */}
          <section className="glass rounded-3xl p-6 shadow-glass space-y-3">
            <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">Interests</h2>
            <p className="text-white/35 text-xs">Used for smarter matching — not revealed.</p>
            <TagSelector selected={tags} onChange={setTags} />
          </section>

          {/* ── Reveal settings ── */}
          <section className="glass rounded-3xl p-6 shadow-glass space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">Reveal settings</h2>
              <p className="text-white/35 text-xs mt-1">Choose what gets shared when you both agree to connect.</p>
            </div>
            <div className="space-y-4">
              <Toggle enabled={revealHandle}  onChange={setRevealHandle}  label="Handle"        hint="Your @username" />
              <Toggle enabled={revealBio}     onChange={setRevealBio}     label="Bio"           hint="Your intro text" />
              <Toggle enabled={revealGithub}  onChange={setRevealGithub}  label="GitHub"        hint="Your GitHub profile URL" />
              <Toggle enabled={revealTwitter} onChange={setRevealTwitter} label="Twitter / X"   hint="Your X profile URL" />
              <Toggle enabled={revealEmail}   onChange={setRevealEmail}   label="Contact email" hint="Your email address" />
            </div>
          </section>

          {/* Error / success */}
          {error && <p className="text-danger text-sm px-1">{error}</p>}
          {success && (
            <p className="text-green text-sm px-1 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green text-white font-semibold rounded-2xl px-4 py-3 text-sm hover:bg-green-dim transition-all disabled:opacity-50 shadow-green-glow"
          >
            {loading ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        {/* Sign out — outside the form */}
        <div className="glass rounded-3xl p-4 shadow-glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Signed in as</p>
              <p className="text-sm text-white/80 font-mono">{session?.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 rounded-xl text-sm text-danger border border-danger/25 hover:bg-danger/10 transition-all"
            >
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

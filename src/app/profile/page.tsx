'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TagSelector from '@/components/TagSelector';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [handle, setHandle] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isGithubLinked, setIsGithubLinked] = useState(false);
  const [error, setError] = useState('');
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
        setGithubUrl(data.githubUrl ?? '');
        setTwitterUrl(data.twitterUrl ?? '');
        setContactEmail(data.contactEmail ?? '');
        setTags(data.tags ?? []);
        setIsGithubLinked(data.isGithubLinked ?? false);
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
      body: JSON.stringify({ handle, githubUrl, twitterUrl, contactEmail, tags }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to save');
    } else {
      setSuccess(true);
    }
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Your profile</h1>
            <p className="text-white/40 text-sm mt-0.5">Shown only on mutual identity reveal</p>
          </div>
          <button
            onClick={() => router.push('/match')}
            className="text-sm text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5"
          >
            Skip →
          </button>
        </div>

        <form onSubmit={handleSave} className="glass rounded-3xl p-6 shadow-glass space-y-5">
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

          {/* GitHub */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              GitHub URL
              {isGithubLinked && (
                <span className="ml-2 text-green text-xs font-normal">● linked</span>
              )}
            </label>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/you"
              type="url"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all"
            />
          </div>

          {/* Twitter */}
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

          {/* Contact email */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Contact email</label>
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all"
            />
            <p className="text-white/25 text-xs font-mono mt-1.5 px-1">only shown on mutual reveal</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Interests <span className="text-white/25 font-normal">(optional — for better matching)</span>
            </label>
            <TagSelector selected={tags} onChange={setTags} />
          </div>

          {error && <p className="text-danger text-sm px-1">{error}</p>}
          {success && (
            <p className="text-green text-sm px-1 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green text-white font-semibold rounded-2xl px-4 py-3 text-sm hover:bg-green-dim transition-all disabled:opacity-50 shadow-green-glow"
            >
              {loading ? 'Saving…' : 'Save profile'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/match')}
              className="px-5 py-3 text-sm glass rounded-2xl text-white/60 hover:text-white transition-all"
            >
              Match →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

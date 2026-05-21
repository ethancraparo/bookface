'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { INTEREST_TAGS } from '@/types';
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
        <span className="font-mono text-text-muted animate-pulse">loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="font-mono text-xl font-bold text-green">bookface</span>
            <p className="text-text-muted text-sm mt-0.5">set up your profile</p>
          </div>
          <button
            onClick={() => router.push('/match')}
            className="text-sm text-text-muted hover:text-text-primary transition-colors font-mono"
          >
            skip →
          </button>
        </div>

        <form onSubmit={handleSave} className="bg-surface border border-border rounded-xl p-6 space-y-5">
          {/* Handle */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5">
              handle <span className="text-danger">*</span>
            </label>
            <div className="flex items-center bg-elevated border border-border rounded-lg overflow-hidden focus-within:border-green transition-colors">
              <span className="px-3 text-text-dim font-mono text-sm">@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="your_handle"
                required
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                className="flex-1 bg-transparent py-2.5 pr-3 text-sm focus:outline-none"
              />
            </div>
            <p className="text-text-dim text-xs font-mono mt-1">letters, numbers, underscores only</p>
          </div>

          {/* GitHub */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5">
              github url
              {isGithubLinked && (
                <span className="ml-2 text-green">● linked</span>
              )}
            </label>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/you"
              type="url"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-dim focus:outline-none focus:border-green transition-colors"
            />
          </div>

          {/* Twitter */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5">twitter / x</label>
            <input
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="https://x.com/you"
              type="url"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-dim focus:outline-none focus:border-green transition-colors"
            />
          </div>

          {/* Contact email */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5">contact email</label>
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-dim focus:outline-none focus:border-green transition-colors"
            />
            <p className="text-text-dim text-xs font-mono mt-1">only shown on mutual identity reveal</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-2">
              interests <span className="text-text-dim">(optional — for better matching)</span>
            </label>
            <TagSelector selected={tags} onChange={setTags} />
          </div>

          {error && <p className="text-danger text-xs font-mono">{error}</p>}
          {success && <p className="text-green text-xs font-mono">✓ saved</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green text-base font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-green-dim transition-colors disabled:opacity-50"
            >
              {loading ? 'saving...' : 'save profile'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/match')}
              className="px-4 py-2.5 text-sm border border-border rounded-lg hover:bg-elevated transition-colors text-text-muted"
            >
              go to match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

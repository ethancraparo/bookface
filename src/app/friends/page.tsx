'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Friend } from '@/types';

export default function FriendsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/friends')
      .then((r) => r.json())
      .then((data) => { setFriends(data); setLoading(false); });
  }, [status]);

  async function accept(id: string) {
    await fetch(`/api/friends/${id}`, { method: 'PATCH' });
    setFriends((prev) => prev.map((f) => f.id === id ? { ...f, status: 'ACCEPTED' } : f));
  }

  async function decline(id: string) {
    await fetch(`/api/friends/${id}`, { method: 'DELETE' });
    setFriends((prev) => prev.filter((f) => f.id !== id));
  }

  const accepted = friends.filter((f) => f.status === 'ACCEPTED');
  const pending  = friends.filter((f) => f.status === 'PENDING');
  const incoming = pending.filter((f) => !f.iRequested);
  const outgoing = pending.filter((f) => f.iRequested);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto animate-fade-in space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              book<span className="text-green">face</span>
            </Link>
            <p className="text-white/35 text-sm mt-0.5">Friends</p>
          </div>
          <Link href="/match" className="text-sm text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5">
            Match →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Incoming requests */}
            {incoming.length > 0 && (
              <section className="glass rounded-3xl p-5 shadow-glass space-y-3">
                <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">
                  Friend requests <span className="text-blue ml-1">{incoming.length}</span>
                </h2>
                {incoming.map((f) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <Avatar handle={f.handle} isVerifiedDev={f.isVerifiedDev} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{f.handle ? `@${f.handle}` : 'Anonymous'}</p>
                      {f.bio && <p className="text-xs text-white/40 truncate">{f.bio}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => decline(f.id)}
                        className="px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => accept(f.id)}
                        className="px-3 py-1.5 rounded-xl text-xs bg-green text-white font-medium hover:bg-green-dim transition-all shadow-green-glow"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Friends list */}
            <section className="glass rounded-3xl p-5 shadow-glass space-y-3">
              <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">
                Friends <span className="text-white/30 ml-1">{accepted.length}</span>
              </h2>

              {accepted.length === 0 && outgoing.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-white/25 text-sm">No friends yet.</p>
                  <p className="text-white/20 text-xs mt-1">Reveal your identity during a match to connect.</p>
                </div>
              )}

              {accepted.map((f) => (
                <Link
                  key={f.id}
                  href={`/messages/${f.userId}`}
                  className="flex items-center gap-3 rounded-2xl hover:bg-white/5 -mx-2 px-2 py-1.5 transition-all group"
                >
                  <Avatar handle={f.handle} isVerifiedDev={f.isVerifiedDev} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-green transition-colors">
                      {f.handle ? `@${f.handle}` : 'Anonymous'}
                    </p>
                    {f.lastMessage ? (
                      <p className="text-xs text-white/40 truncate">
                        {f.lastMessage.senderId !== f.userId ? 'You: ' : ''}{f.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-xs text-white/25">No messages yet</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(f.unreadCount ?? 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-green text-white text-[10px] font-bold flex items-center justify-center">
                        {f.unreadCount}
                      </span>
                    )}
                    <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </Link>
              ))}

              {/* Outgoing pending */}
              {outgoing.map((f) => (
                <div key={f.id} className="flex items-center gap-3 opacity-50">
                  <Avatar handle={f.handle} isVerifiedDev={f.isVerifiedDev} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{f.handle ? `@${f.handle}` : 'Anonymous'}</p>
                    <p className="text-xs text-white/40">Request sent</p>
                  </div>
                  <button
                    onClick={() => decline(f.id)}
                    className="text-xs text-white/30 hover:text-danger transition-colors px-2"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Avatar({ handle, isVerifiedDev }: { handle: string | null; isVerifiedDev: boolean }) {
  const initials = handle ? handle[0].toUpperCase() : '?';
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${isVerifiedDev ? 'bg-green/15 border border-green/30 text-green' : 'bg-white/[0.08] border border-white/10 text-white/60'}`}>
      {initials}
    </div>
  );
}

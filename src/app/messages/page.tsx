'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Friend } from '@/types';

export default function MessagesPage() {
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
      .then((data: Friend[]) => {
        setFriends(data.filter((f) => f.status === 'ACCEPTED'));
        setLoading(false);
      });
  }, [status]);

  const totalUnread = friends.reduce((n, f) => n + (f.unreadCount ?? 0), 0);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto animate-fade-in space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              book<span className="text-green">face</span>
            </Link>
            <p className="text-white/35 text-sm mt-0.5">
              Messages {totalUnread > 0 && <span className="text-green">· {totalUnread} unread</span>}
            </p>
          </div>
          <Link href="/match" className="text-sm text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5">
            Match →
          </Link>
        </div>

        <div className="glass rounded-3xl shadow-glass overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12 px-6">
              <p className="text-white/25 text-sm">No messages yet.</p>
              <p className="text-white/20 text-xs mt-1">Add friends by revealing your identity during a match.</p>
              <Link href="/match" className="inline-block mt-4 text-sm text-green hover:underline">
                Find someone to chat with →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {friends
                .sort((a, b) => {
                  const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                  const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                  return tb - ta;
                })
                .map((f) => (
                  <Link
                    key={f.id}
                    href={`/messages/${f.userId}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.04] transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${f.isVerifiedDev ? 'bg-green/15 border border-green/30 text-green' : 'bg-white/[0.08] border border-white/10 text-white/60'}`}>
                      {f.handle ? f.handle[0].toUpperCase() : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium ${(f.unreadCount ?? 0) > 0 ? 'text-white' : 'text-white/80'}`}>
                          {f.handle ? `@${f.handle}` : 'Anonymous'}
                          {f.isVerifiedDev && <span className="ml-1.5 text-[10px] text-green font-mono">verified dev ✓</span>}
                        </p>
                        {f.lastMessage && (
                          <span className="text-[11px] text-white/25 shrink-0">
                            {formatTime(f.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {f.lastMessage ? (
                        <p className={`text-xs truncate ${(f.unreadCount ?? 0) > 0 ? 'text-white/60 font-medium' : 'text-white/35'}`}>
                          {f.lastMessage.senderId !== f.userId ? 'You: ' : ''}{f.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs text-white/25">No messages yet — say hi!</p>
                      )}
                    </div>
                    {(f.unreadCount ?? 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-green text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {f.unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

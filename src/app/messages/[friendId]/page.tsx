'use client';
import { useEffect, useRef, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { DMMessage } from '@/types';

interface FriendInfo {
  id: string;
  handle: string | null;
  bio: string | null;
  isVerifiedDev: boolean;
}

export default function ConversationPage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [friend, setFriend] = useState<FriendInfo | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  // Load history
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/messages/${friendId}`)
      .then((r) => {
        if (r.status === 403) { router.push('/friends'); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setFriend(data.friend);
        setMessages(data.messages);
        setLoading(false);
      });
  }, [status, friendId, router]);

  // Socket.io DM connection
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;

    const socket = io('/dm', { path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register', session.user.id);
      socket.emit('mark_read', { fromUserId: friendId });
    });

    socket.on('message', (msg: DMMessage) => {
      if (msg.senderId === friendId) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('mark_read', { fromUserId: friendId });
      }
    });

    socket.on('message_sent', (msg: DMMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => { socket.disconnect(); };
  }, [status, session?.user?.id, friendId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit('send_message', { toUserId: friendId, content: text });
    setInput('');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const myId = session?.user?.id;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 glass border-b border-white/[0.08] shrink-0">
        <Link href="/messages" className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        {friend ? (
          <div className="flex items-center gap-2.5 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${friend.isVerifiedDev ? 'bg-green/15 border border-green/30 text-green' : 'bg-white/[0.08] border border-white/10 text-white/60'}`}>
              {friend.handle ? friend.handle[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">
                {friend.handle ? `@${friend.handle}` : 'Anonymous'}
                {friend.isVerifiedDev && <span className="ml-1.5 text-[10px] text-green font-mono">verified dev ✓</span>}
              </p>
              {friend.bio && <p className="text-xs text-white/35 mt-0.5 truncate max-w-[200px]">{friend.bio}</p>}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <Link href="/" className="text-sm font-bold tracking-tight text-white">
          book<span className="text-green">face</span>
        </Link>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center pt-12">
            <div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-12">
            <p className="text-white/25 text-sm">No messages yet.</p>
            <p className="text-white/20 text-xs mt-1">Say hi to {friend?.handle ? `@${friend.handle}` : 'your new friend'}!</p>
          </div>
        ) : (
          <>
            {messages.map((m, i) => {
              const fromMe = m.senderId === myId;
              const showDate = i === 0 || new Date(m.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 300_000;
              return (
                <div key={m.id}>
                  {showDate && (
                    <p className="text-center text-[11px] text-white/20 my-3">{formatDate(m.createdAt)}</p>
                  )}
                  <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
                      fromMe
                        ? 'bg-green text-white rounded-[18px] rounded-br-[5px]'
                        : 'glass text-white/90 rounded-[18px] rounded-bl-[5px]'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="flex items-end gap-2 glass rounded-3xl px-4 py-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none resize-none max-h-32"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-full bg-green flex items-center justify-center shrink-0 shadow-green-glow disabled:opacity-30 transition-opacity"
          >
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
            </svg>
          </button>
        </div>
        <p className="text-center text-[11px] text-white/15 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

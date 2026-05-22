'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import ThemeSelector from './ThemeSelector';
import TagSelector from './TagSelector';
import { io, Socket } from 'socket.io-client';
import { Friend, DMMessage } from '@/types';

type Tab = 'match' | 'friends' | 'messages' | 'profile';

interface Props {
  handle?: string;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  startMatching: (tags: string[]) => void;
}

export default function IdleDashboard({ handle, selectedTags, setSelectedTags, startMatching }: Props) {
  const [tab, setTab] = useState<Tab>('match');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  // null = list view, string = conversation open for that userId
  const [openConvoId, setOpenConvoId] = useState<string | null>(null);

  const refreshFriends = useCallback(() => {
    fetch('/api/friends')
      .then((r) => r.json())
      .then((data: Friend[]) => {
        setFriends(Array.isArray(data) ? data : []);
        setFriendsLoading(false);
      });
  }, []);

  useEffect(() => { refreshFriends(); }, [refreshFriends]);

  // When a convo closes, refresh unread counts
  function handleCloseConvo() {
    setOpenConvoId(null);
    refreshFriends();
  }

  function openConvo(userId: string, targetTab: Tab) {
    setTab(targetTab);
    setOpenConvoId(userId);
  }

  const pendingCount = friends.filter((f) => f.status === 'PENDING' && !f.iRequested).length;
  const unreadCount  = friends.reduce((n, f) => n + (f.unreadCount ?? 0), 0);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'match',    label: 'Match' },
    { id: 'friends',  label: 'Friends',  badge: pendingCount || undefined },
    { id: 'messages', label: 'Messages', badge: unreadCount  || undefined },
    { id: 'profile',  label: 'Profile' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-3 glass border-b border-white/[0.08] shrink-0">
        <span className="text-base font-bold tracking-tight text-white">
          book<span className="text-green">face</span>
        </span>
        <div className="flex items-center gap-1.5">
          {handle && <span className="text-sm text-white/40 font-mono mr-1">@{handle}</span>}
          <ThemeSelector />
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="flex items-end gap-0 px-6 border-b border-white/[0.08] shrink-0">
        {tabs.map(({ id, label, badge }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setOpenConvoId(null); }}
            className={`relative px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === id ? 'text-white border-green' : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {label}
            {badge != null && (
              <span className="absolute top-1.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-green text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Conversation view — overlays whichever tab is active */}
        {openConvoId && (
          <ConversationView
            friendId={openConvoId}
            onBack={handleCloseConvo}
          />
        )}

        {!openConvoId && tab === 'match'    && <MatchTab selectedTags={selectedTags} setSelectedTags={setSelectedTags} startMatching={startMatching} handle={handle} />}
        {!openConvoId && tab === 'friends'  && <FriendsTab friends={friends} loading={friendsLoading} onRefresh={refreshFriends} onOpenConvo={(id) => openConvo(id, 'messages')} />}
        {!openConvoId && tab === 'messages' && <MessagesTab friends={friends.filter((f) => f.status === 'ACCEPTED')} loading={friendsLoading} onOpenConvo={(id) => openConvo(id, 'messages')} />}
        {!openConvoId && tab === 'profile'  && <ProfileTab />}
      </div>
    </div>
  );
}

// ── Inline conversation view ───────────────────────────────────────────────────

interface FriendInfo {
  id: string;
  handle: string | null;
  bio: string | null;
  isVerifiedDev: boolean;
}

function ConversationView({ friendId, onBack }: { friendId: string; onBack: () => void }) {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [friend, setFriend] = useState<FriendInfo | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/messages/${friendId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.error) return;
        setFriend(data.friend);
        setMessages(data.messages);
        setLoading(false);
      });
  }, [status, friendId]);

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

  // Scroll to bottom
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
    <div className="flex flex-col h-full">
      {/* Convo header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        {friend && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${friend.isVerifiedDev ? 'bg-green/15 border border-green/30 text-green' : 'bg-white/[0.08] border border-white/10 text-white/60'}`}>
              {friend.handle ? friend.handle[0].toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-none">
                {friend.handle ? `@${friend.handle}` : 'Anonymous'}
                {friend.isVerifiedDev && <span className="ml-1.5 text-[10px] text-green font-mono">verified dev ✓</span>}
              </p>
              {friend.bio && <p className="text-xs text-white/35 mt-0.5 truncate">{friend.bio}</p>}
            </div>
          </div>
        )}
      </div>

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
              const showDate = i === 0 || new Date(m.createdAt).getTime() - new Date(messages[i - 1].createdAt).getTime() > 300_000;
              return (
                <div key={m.id}>
                  {showDate && (
                    <p className="text-center text-[11px] text-white/20 my-3">{fmtDate(m.createdAt)}</p>
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
      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/[0.08]">
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

// ── Match tab ─────────────────────────────────────────────────────────────────

function MatchTab({ selectedTags, setSelectedTags, startMatching, handle }: {
  selectedTags: string[];
  setSelectedTags: (t: string[]) => void;
  startMatching: (t: string[]) => void;
  handle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-white">
          book<span className="text-green">face</span>
        </h1>
        <p className="text-white/45 text-[15px]">Random video chat for vibe coders</p>
      </div>
      <div className="w-full max-w-md glass rounded-3xl p-6 shadow-glass space-y-5">
        <div>
          <p className="text-sm font-medium text-white/60 mb-3">
            Interest tags <span className="text-white/30 font-normal">(optional)</span>
          </p>
          <TagSelector selected={selectedTags} onChange={setSelectedTags} />
        </div>
        <button
          onClick={() => startMatching(selectedTags)}
          className="w-full bg-green text-white font-semibold rounded-2xl py-3.5 text-[15px] hover:bg-green-dim transition-all hover:scale-[1.01] active:scale-[0.99] shadow-green-glow"
        >
          Find a match →
        </button>
      </div>
      {!handle && (
        <p className="text-sm text-white/30">
          Go to <button onClick={() => {}} className="text-green hover:underline">Profile</button> to set up your profile before you connect
        </p>
      )}
    </div>
  );
}

// ── Friends tab ───────────────────────────────────────────────────────────────

function FriendsTab({ friends, loading, onRefresh, onOpenConvo }: {
  friends: Friend[];
  loading: boolean;
  onRefresh: () => void;
  onOpenConvo: (userId: string) => void;
}) {
  const accepted = friends.filter((f) => f.status === 'ACCEPTED');
  const incoming = friends.filter((f) => f.status === 'PENDING' && !f.iRequested);
  const outgoing = friends.filter((f) => f.status === 'PENDING' && f.iRequested);

  async function accept(id: string) {
    await fetch(`/api/friends/${id}`, { method: 'PATCH' });
    onRefresh();
  }
  async function decline(id: string) {
    await fetch(`/api/friends/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  if (loading) return <TabSpinner />;

  return (
    <div className="max-w-lg mx-auto px-6 py-6 space-y-5">
      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section className="glass rounded-3xl p-5 shadow-glass space-y-3">
          <SectionLabel>Friend requests <span className="text-white/60 ml-1">{incoming.length}</span></SectionLabel>
          {incoming.map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <FriendAvatar handle={f.handle} isVerifiedDev={f.isVerifiedDev} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{f.handle ? `@${f.handle}` : 'Anonymous'}</p>
                {f.bio && <p className="text-xs text-white/40 truncate">{f.bio}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => decline(f.id)} className="px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all">Decline</button>
                <button onClick={() => accept(f.id)} className="px-3 py-1.5 rounded-xl text-xs bg-green text-white font-medium hover:bg-green-dim transition-all shadow-green-glow">Accept</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Friends list */}
      <section className="glass rounded-3xl p-5 shadow-glass space-y-1">
        <SectionLabel>Friends <span className="text-white/30 ml-1">{accepted.length}</span></SectionLabel>

        {accepted.length === 0 && outgoing.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/25 text-sm">No friends yet.</p>
            <p className="text-white/20 text-xs mt-1">Reveal your identity during a match to connect.</p>
          </div>
        )}

        {accepted.map((f) => (
          <button
            key={f.id}
            onClick={() => onOpenConvo(f.userId)}
            className="w-full flex items-center gap-3 rounded-2xl hover:bg-white/5 -mx-2 px-2 py-2 transition-all group text-left"
          >
            <FriendAvatar handle={f.handle} isVerifiedDev={f.isVerifiedDev} />
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
                <span className="w-5 h-5 rounded-full bg-green text-white text-[10px] font-bold flex items-center justify-center">{f.unreadCount}</span>
              )}
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </button>
        ))}

        {outgoing.map((f) => (
          <div key={f.id} className="flex items-center gap-3 opacity-50">
            <FriendAvatar handle={f.handle} isVerifiedDev={f.isVerifiedDev} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{f.handle ? `@${f.handle}` : 'Anonymous'}</p>
              <p className="text-xs text-white/40">Request sent</p>
            </div>
            <button onClick={() => decline(f.id)} className="text-xs text-white/30 hover:text-danger transition-colors px-2">Cancel</button>
          </div>
        ))}
      </section>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────────

function MessagesTab({ friends, loading, onOpenConvo }: {
  friends: Friend[];
  loading: boolean;
  onOpenConvo: (userId: string) => void;
}) {
  if (loading) return <TabSpinner />;

  const sorted = [...friends].sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta;
  });

  return (
    <div className="max-w-lg mx-auto px-6 py-6">
      <div className="glass rounded-3xl shadow-glass overflow-hidden">
        {sorted.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-white/25 text-sm">No messages yet.</p>
            <p className="text-white/20 text-xs mt-1">Add friends by revealing your identity during a match.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {sorted.map((f) => (
              <button
                key={f.id}
                onClick={() => onOpenConvo(f.userId)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.04] transition-all group text-left"
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
                      <span className="text-[11px] text-white/25 shrink-0">{fmtTime(f.lastMessage.createdAt)}</span>
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
                  <span className="w-5 h-5 rounded-full bg-green text-white text-[10px] font-bold flex items-center justify-center shrink-0">{f.unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all';

function ProfileTab() {
  const [handle,       setHandle]       = useState('');
  const [bio,          setBio]          = useState('');
  const [githubUrl,    setGithubUrl]    = useState('');
  const [twitterUrl,   setTwitterUrl]   = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [tags,         setTags]         = useState<string[]>([]);

  const [revealHandle,  setRevealHandle]  = useState(true);
  const [revealBio,     setRevealBio]     = useState(true);
  const [revealGithub,  setRevealGithub]  = useState(true);
  const [revealTwitter, setRevealTwitter] = useState(true);
  const [revealEmail,   setRevealEmail]   = useState(true);

  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  useEffect(() => {
    fetch('/api/profile').then((r) => r.json()).then((d) => {
      setHandle(d.handle ?? '');
      setBio(d.bio ?? '');
      setGithubUrl(d.githubUrl ?? '');
      setTwitterUrl(d.twitterUrl ?? '');
      setContactEmail(d.contactEmail ?? '');
      setTags(d.tags ?? []);
      setRevealHandle(d.revealHandle ?? true);
      setRevealBio(d.revealBio ?? true);
      setRevealGithub(d.revealGithub ?? true);
      setRevealTwitter(d.revealTwitter ?? true);
      setRevealEmail(d.revealEmail ?? true);
      setFetching(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess(false);
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, bio, githubUrl, twitterUrl, contactEmail, tags, revealHandle, revealBio, revealGithub, revealTwitter, revealEmail }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? 'Failed to save');
    else setSuccess(true);
    setLoading(false);
  }

  if (fetching) return <TabSpinner />;

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto px-6 py-6 space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          <section className="glass rounded-3xl p-6 shadow-glass space-y-5">
            <SectionLabel>Identity</SectionLabel>
            <ProfileField label="Handle *">
              <div className="flex items-center bg-white/[0.06] border border-white/[0.1] rounded-2xl overflow-hidden focus-within:border-green/60 transition-all">
                <span className="px-4 text-white/30 font-mono text-sm select-none">@</span>
                <input
                  value={handle} onChange={(e) => setHandle(e.target.value)}
                  placeholder="your_handle" required maxLength={30} pattern="[a-zA-Z0-9_]+"
                  className="flex-1 bg-transparent py-3 pr-4 text-sm text-white focus:outline-none"
                />
              </div>
              <p className="text-white/25 text-xs font-mono mt-1 px-1">letters, numbers, underscores only</p>
            </ProfileField>
            <ProfileField label="Bio">
              <textarea
                value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder="What are you building? What's your vibe?"
                maxLength={200} rows={3} className={`${inputCls} resize-none`}
              />
              <p className="text-white/20 text-xs font-mono mt-1 px-1 text-right">{bio.length}/200</p>
            </ProfileField>
          </section>

          <section className="glass rounded-3xl p-6 shadow-glass space-y-4">
            <SectionLabel>Links</SectionLabel>
            <ProfileField label="GitHub">
              <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/you" type="url" className={inputCls} />
            </ProfileField>
            <ProfileField label="Twitter / X">
              <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/you" type="url" className={inputCls} />
            </ProfileField>
            <ProfileField label="Contact email">
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" type="email" className={inputCls} />
            </ProfileField>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <section className="glass rounded-3xl p-6 shadow-glass space-y-4">
            <div>
              <SectionLabel>Reveal settings</SectionLabel>
              <p className="text-white/30 text-xs mt-1.5 leading-relaxed">Choose what gets shared when you both agree to connect.</p>
            </div>
            <div className="divide-y divide-white/[0.06] space-y-1">
              <ProfileToggle enabled={revealHandle}  onChange={setRevealHandle}  label="Handle"        hint="Your @username" />
              <ProfileToggle enabled={revealBio}     onChange={setRevealBio}     label="Bio"           hint="Your intro text" />
              <ProfileToggle enabled={revealGithub}  onChange={setRevealGithub}  label="GitHub"        hint="Your GitHub profile URL" />
              <ProfileToggle enabled={revealTwitter} onChange={setRevealTwitter} label="Twitter / X"   hint="Your X profile URL" />
              <ProfileToggle enabled={revealEmail}   onChange={setRevealEmail}   label="Contact email" hint="Your email address" />
            </div>
          </section>

          <section className="glass rounded-3xl p-6 shadow-glass space-y-4">
            <div>
              <SectionLabel>Interests</SectionLabel>
              <p className="text-white/30 text-xs mt-1.5">Used for smarter matching — not revealed to others.</p>
            </div>
            <TagSelector selected={tags} onChange={setTags} />
          </section>
        </div>
      </div>

      {/* Save + sign out row */}
      <div className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          {error && (
            <p className="text-danger text-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </p>
          )}
          {success && (
            <p className="text-green text-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Saved
            </p>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="bg-danger/15 border border-danger/30 text-danger font-semibold rounded-2xl px-6 py-2.5 text-sm hover:bg-danger/25 transition-all"
          >
            Sign out
          </button>
          <button
            type="submit" disabled={loading}
            className="bg-green text-white font-semibold rounded-2xl px-8 py-2.5 text-sm hover:bg-green-dim transition-all disabled:opacity-50 shadow-green-glow"
          >
            {loading ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function TabSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-white/35 uppercase tracking-widest">{children}</h2>;
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function ProfileToggle({ enabled, onChange, label, hint }: { enabled: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-sm text-white/70">{label}</div>
        {hint && <div className="text-xs text-white/30 mt-0.5">{hint}</div>}
      </div>
      <button
        type="button" onClick={() => onChange(!enabled)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-green' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function FriendAvatar({ handle, isVerifiedDev }: { handle: string | null; isVerifiedDev: boolean }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${isVerifiedDev ? 'bg-green/15 border border-green/30 text-green' : 'bg-white/[0.08] border border-white/10 text-white/60'}`}>
      {handle ? handle[0].toUpperCase() : '?'}
    </div>
  );
}

function fmtTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return 'now';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 86_400_000) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

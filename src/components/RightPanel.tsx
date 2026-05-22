'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import ChatPanel from './ChatPanel';
import TagSelector from './TagSelector';
import { ChatMessage, Friend, DMMessage, ReportCategory, RevealedIdentity } from '@/types';

// ── Public types ──────────────────────────────────────────────────────────────

export type OverlayKind =
  | 'none'
  | 'report'
  | 'reveal-outgoing'
  | 'reveal-incoming'
  | 'reveal-identity';

type RightTab = 'chat' | 'friends' | 'messages' | 'profile';

interface Props {
  // Session state
  sessionActive: boolean;
  // Chat
  messages: ChatMessage[];
  onSend: (text: string) => void;
  // Overlay (reveal / report panels replace chat content)
  overlay: OverlayKind;
  onClearOverlay: () => void;
  revealedIdentity: RevealedIdentity | null;
  onRespondToReveal: (accept: boolean) => void;
  onReportUser: (cat: ReportCategory) => void;
  onDismissReveal: () => void;
}

// ── RightPanel ────────────────────────────────────────────────────────────────

export default function RightPanel({
  sessionActive, messages, onSend,
  overlay, onClearOverlay, revealedIdentity, onRespondToReveal, onReportUser, onDismissReveal,
}: Props) {
  const [tab, setTab] = useState<RightTab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
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

  // Auto-switch to chat when session goes active
  useEffect(() => {
    if (sessionActive) setTab('chat');
  }, [sessionActive]);

  // Auto-switch to chat when a reveal/report overlay fires
  useEffect(() => {
    if (overlay !== 'none') setTab('chat');
  }, [overlay]);

  // Reset to friends when session ends
  useEffect(() => {
    if (!sessionActive) { setTab('friends'); setOpenConvoId(null); }
  }, [sessionActive]);

  const pendingCount = friends.filter((f) => f.status === 'PENDING' && !f.iRequested).length;
  const unreadCount  = friends.reduce((n, f) => n + (f.unreadCount ?? 0), 0);

  type TabDef = { id: RightTab; label: string; badge?: number; onlyActive?: boolean };
  const tabDefs: TabDef[] = [
    { id: 'chat',     label: 'Chat',     onlyActive: true },
    { id: 'friends',  label: 'Friends',  badge: pendingCount || undefined },
    { id: 'messages', label: 'Messages', badge: unreadCount  || undefined },
    { id: 'profile',  label: 'Profile' },
  ];
  const visibleTabs = tabDefs.filter((t) => !t.onlyActive || sessionActive);

  function switchTab(id: RightTab) { setTab(id); setOpenConvoId(null); }

  return (
    <div className="h-full flex flex-col overflow-hidden border-l border-white/[0.06]">
      {/* Tab bar */}
      <div className="flex items-end px-4 border-b border-white/[0.08] shrink-0">
        {visibleTabs.map(({ id, label, badge }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`relative px-3.5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === id
                ? 'text-white border-green'
                : 'text-white/40 border-transparent hover:text-white/70'
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Chat tab */}
        {tab === 'chat' && (
          overlay !== 'none'
            ? <OverlayContent
                overlay={overlay}
                onClear={onClearOverlay}
                revealedIdentity={revealedIdentity}
                onRespondToReveal={onRespondToReveal}
                onReportUser={onReportUser}
                onDismissReveal={onDismissReveal}
              />
            : <div className="h-full flex flex-col">
                <ChatPanel messages={messages} onSend={onSend} />
              </div>
        )}

        {/* Friends tab */}
        {tab === 'friends' && !openConvoId && (
          <FriendsTab
            friends={friends}
            loading={friendsLoading}
            onRefresh={refreshFriends}
            onOpenConvo={(id) => setOpenConvoId(id)}
          />
        )}

        {/* Messages tab */}
        {tab === 'messages' && !openConvoId && (
          <MessagesTab
            friends={friends.filter((f) => f.status === 'ACCEPTED')}
            loading={friendsLoading}
            onOpenConvo={(id) => setOpenConvoId(id)}
          />
        )}

        {/* Profile tab */}
        {tab === 'profile' && <ProfileTab />}

        {/* Inline conversation — overlays Friends/Messages content */}
        {openConvoId && tab !== 'chat' && (
          <ConversationView
            friendId={openConvoId}
            onBack={() => { setOpenConvoId(null); refreshFriends(); }}
          />
        )}
      </div>
    </div>
  );
}

// ── Overlay content (reveal / report panels inside the Chat tab) ──────────────

function OverlayContent({ overlay, onClear, revealedIdentity, onRespondToReveal, onReportUser, onDismissReveal }: {
  overlay: OverlayKind;
  onClear: () => void;
  revealedIdentity: RevealedIdentity | null;
  onRespondToReveal: (a: boolean) => void;
  onReportUser: (cat: ReportCategory) => void;
  onDismissReveal: () => void;
}) {
  if (overlay === 'report')          return <ReportPanel onReport={onReportUser} onClose={onClear} />;
  if (overlay === 'reveal-outgoing') return <RevealOutgoingPanel onBack={onClear} />;
  if (overlay === 'reveal-incoming') return <RevealIncomingPanel onAccept={() => onRespondToReveal(true)} onDecline={() => { onRespondToReveal(false); onClear(); }} />;
  if (overlay === 'reveal-identity' && revealedIdentity) return <RevealIdentityPanel identity={revealedIdentity} onClose={() => { onDismissReveal(); onClear(); }} />;
  return null;
}

// ── Overlay panel components ──────────────────────────────────────────────────

function PanelHeader({ icon, title, onClose }: { icon: React.ReactNode; title: string; onClose?: () => void }) {
  return (
    <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2.5">{icon}<span className="text-sm font-medium text-white">{title}</span></div>
      {onClose && (
        <button onClick={onClose} className="w-7 h-7 rounded-full glass flex items-center justify-center text-white/40 hover:text-white transition-colors">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}

const REPORT_CATS: { value: ReportCategory; label: string; desc: string }[] = [
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content', desc: 'Nudity, sexual content, or disturbing material' },
  { value: 'HARASSMENT',            label: 'Harassment',            desc: 'Bullying, threats, or targeted abuse' },
  { value: 'SPAM',                  label: 'Spam / bot',            desc: 'Automated behavior or repeated irrelevant content' },
];

function ReportPanel({ onReport, onClose }: { onReport: (cat: ReportCategory) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<ReportCategory | null>(null);
  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      <PanelHeader icon={<DIcon />} title="Report user" onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-white/50 text-sm leading-relaxed">Select a reason. This will end the session and block this user.</p>
        {REPORT_CATS.map((c) => (
          <button key={c.value} onClick={() => setSelected(c.value)}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all ${selected === c.value ? 'border-danger/60 bg-danger/10' : 'glass hover:border-white/20'}`}>
            <div className="text-sm font-medium text-white">{c.label}</div>
            <div className="text-xs text-white/40 mt-0.5">{c.desc}</div>
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-white/[0.08] flex gap-2.5">
        <button onClick={onClose} className="flex-1 py-3 rounded-2xl glass text-white/70 hover:text-white font-medium text-sm transition-all">Cancel</button>
        <button onClick={() => selected && onReport(selected)} disabled={!selected} className="flex-1 py-3 rounded-2xl bg-danger text-white font-semibold text-sm hover:bg-red-600 transition-all disabled:opacity-30">Report</button>
      </div>
    </div>
  );
}

function RevealOutgoingPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      <PanelHeader icon={<LinkIcon />} title="Reveal request sent" />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-green/30 border-t-green animate-spin" />
        <div>
          <p className="text-white/80 font-medium">Waiting for them to accept…</p>
          <p className="text-white/40 text-sm mt-1">You'll see their profile as soon as they agree.</p>
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.08]">
        <button onClick={onBack} className="w-full py-3 rounded-2xl glass text-white/60 hover:text-white font-medium text-sm transition-all">← Back to chat</button>
      </div>
    </div>
  );
}

function RevealIncomingPanel({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      <PanelHeader icon={<LinkIcon />} title="They want to connect" />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-2xl">🤝</div>
        <div>
          <p className="text-white/80 font-medium">Reveal your identity?</p>
          <p className="text-white/40 text-sm mt-1.5 leading-relaxed max-w-[200px]">You'll each share whatever info you've chosen in your profile settings.</p>
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.08] flex gap-2.5">
        <button onClick={onDecline} className="flex-1 py-3 rounded-2xl glass text-white/70 hover:text-white font-medium text-sm transition-all">Decline</button>
        <button onClick={onAccept} className="flex-1 py-3 rounded-2xl bg-green text-white font-semibold text-sm hover:bg-green-dim transition-all shadow-green-glow">Reveal ✓</button>
      </div>
    </div>
  );
}

function RevealIdentityPanel({ identity, onClose }: { identity: RevealedIdentity; onClose: () => void }) {
  const [friendStatus, setFriendStatus] = useState<'idle' | 'loading' | 'sent' | 'friends'>('idle');

  async function sendFriendRequest() {
    setFriendStatus('loading');
    const res = await fetch('/api/friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addresseeId: identity.userId }) });
    const data = await res.json();
    if (res.ok) setFriendStatus(data.status === 'ACCEPTED' ? 'friends' : 'sent');
    else setFriendStatus(data.error === 'Already friends' ? 'friends' : 'sent');
  }

  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      <PanelHeader icon={<CheckIcon small />} title="Identity revealed" onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="glass rounded-2xl p-4 space-y-3">
          {identity.handle    && <IdentityRow icon="@" label="Handle" value={`@${identity.handle}`} />}
          {identity.bio       && <div className="flex gap-3"><div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-xs shrink-0">✦</div><div className="flex-1 min-w-0"><div className="text-[11px] text-white/35 uppercase tracking-wide font-medium">Bio</div><div className="text-sm text-white/80 leading-relaxed">{identity.bio}</div></div></div>}
          {identity.githubUrl && <IdentityRow icon={<GithubIcon />} label="GitHub" value={identity.githubUrl} href={identity.githubUrl} badge={identity.isVerifiedDev ? 'verified dev ✓' : undefined} />}
          {identity.twitterUrl && <IdentityRow icon="𝕏" label="Twitter" value={identity.twitterUrl} href={identity.twitterUrl} />}
          {identity.contactEmail && <IdentityRow icon="✉" label="Email" value={identity.contactEmail} href={`mailto:${identity.contactEmail}`} />}
          {!identity.handle && !identity.bio && !identity.githubUrl && !identity.twitterUrl && !identity.contactEmail && (
            <p className="text-white/30 text-sm text-center py-2">They chose not to share any details.</p>
          )}
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.08] flex gap-2.5">
        {friendStatus === 'idle' && (
          <button onClick={sendFriendRequest} className="flex-1 py-3 rounded-2xl glass text-white/70 hover:text-white font-medium text-sm transition-all flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            Add friend
          </button>
        )}
        {friendStatus === 'loading' && <div className="flex-1 py-3 rounded-2xl glass text-white/40 text-sm flex items-center justify-center gap-2"><div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />Sending…</div>}
        {friendStatus === 'sent'    && <div className="flex-1 py-3 rounded-2xl bg-green/10 border border-green/25 text-green text-sm flex items-center justify-center gap-2"><CheckIcon />Request sent</div>}
        {friendStatus === 'friends' && <div className="flex-1 py-3 rounded-2xl bg-green/10 border border-green/25 text-green text-sm flex items-center justify-center gap-2"><CheckIcon />Friends!</div>}
        <button onClick={onClose} className="flex-1 py-3 rounded-2xl glass text-white/60 hover:text-white font-medium text-sm transition-all">Done</button>
      </div>
    </div>
  );
}

// ── Inline DM conversation ────────────────────────────────────────────────────

function ConversationView({ friendId, onBack }: { friendId: string; onBack: () => void }) {
  const { data: session, status } = useSession();
  const [msgs, setMsgs] = useState<DMMessage[]>([]);
  const [friend, setFriend] = useState<{ handle: string | null; bio: string | null; isVerifiedDev: boolean } | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/messages/${friendId}`).then((r) => r.json()).then((data) => {
      if (!data || data.error) return;
      setFriend(data.friend);
      setMsgs(data.messages);
      setLoading(false);
    });
  }, [status, friendId]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    const socket = io('/dm', { path: '/socket.io' });
    socketRef.current = socket;
    socket.on('connect', () => { socket.emit('register', session.user.id); socket.emit('mark_read', { fromUserId: friendId }); });
    socket.on('message', (msg: DMMessage) => { if (msg.senderId === friendId) { setMsgs((p) => [...p, msg]); socket.emit('mark_read', { fromUserId: friendId }); } });
    socket.on('message_sent', (msg: DMMessage) => setMsgs((p) => [...p, msg]));
    return () => { socket.disconnect(); };
  }, [status, session?.user?.id, friendId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  function send() {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit('send_message', { toUserId: friendId, content: text });
    setInput('');
  }

  const myId = session?.user?.id;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] shrink-0">
        <button onClick={onBack} className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        {friend && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${friend.isVerifiedDev ? 'bg-green/15 border border-green/30 text-green' : 'bg-white/[0.08] border border-white/10 text-white/60'}`}>
              {friend.handle ? friend.handle[0].toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-none">{friend.handle ? `@${friend.handle}` : 'Anonymous'}{friend.isVerifiedDev && <span className="ml-1.5 text-[10px] text-green font-mono">verified dev ✓</span>}</p>
              {friend.bio && <p className="text-xs text-white/35 mt-0.5 truncate">{friend.bio}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? <div className="flex justify-center pt-12"><div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" /></div>
          : msgs.length === 0 ? <div className="text-center pt-12"><p className="text-white/25 text-sm">No messages yet — say hi!</p></div>
          : <>
            {msgs.map((m, i) => {
              const fromMe = m.senderId === myId;
              const showDate = i === 0 || new Date(m.createdAt).getTime() - new Date(msgs[i - 1].createdAt).getTime() > 300_000;
              return (
                <div key={m.id}>
                  {showDate && <p className="text-center text-[11px] text-white/20 my-3">{fmtDate(m.createdAt)}</p>}
                  <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${fromMe ? 'bg-green text-white rounded-[18px] rounded-br-[5px]' : 'glass text-white/90 rounded-[18px] rounded-bl-[5px]'}`}>{m.content}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        }
      </div>

      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/[0.08]">
        <div className="flex items-end gap-2 glass rounded-3xl px-4 py-3">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Message…" rows={1} className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none resize-none max-h-32" style={{ lineHeight: '1.5' }} />
          <button onClick={send} disabled={!input.trim()} className="w-8 h-8 rounded-full bg-green flex items-center justify-center shrink-0 shadow-green-glow disabled:opacity-30 transition-opacity">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Friends tab ───────────────────────────────────────────────────────────────

function FriendsTab({ friends, loading, onRefresh, onOpenConvo }: {
  friends: Friend[]; loading: boolean; onRefresh: () => void; onOpenConvo: (id: string) => void;
}) {
  const accepted = friends.filter((f) => f.status === 'ACCEPTED');
  const incoming = friends.filter((f) => f.status === 'PENDING' && !f.iRequested);
  const outgoing = friends.filter((f) => f.status === 'PENDING' && f.iRequested);

  async function accept(id: string) { await fetch(`/api/friends/${id}`, { method: 'PATCH' }); onRefresh(); }
  async function decline(id: string) { await fetch(`/api/friends/${id}`, { method: 'DELETE' }); onRefresh(); }

  if (loading) return <Spinner />;

  return (
    <div className="px-4 py-4 space-y-4">
      {incoming.length > 0 && (
        <section className="glass rounded-2xl p-4 space-y-3">
          <Label>Requests <span className="text-white/60 ml-1">{incoming.length}</span></Label>
          {incoming.map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <Avatar handle={f.handle} v={f.isVerifiedDev} />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white">{f.handle ? `@${f.handle}` : 'Anonymous'}</p>{f.bio && <p className="text-xs text-white/40 truncate">{f.bio}</p>}</div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => decline(f.id)} className="px-2.5 py-1 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all">Decline</button>
                <button onClick={() => accept(f.id)} className="px-2.5 py-1 rounded-lg text-xs bg-green text-white font-medium hover:bg-green-dim transition-all">Accept</button>
              </div>
            </div>
          ))}
        </section>
      )}
      <section className="glass rounded-2xl p-4 space-y-1">
        <Label>Friends <span className="text-white/30 ml-1">{accepted.length}</span></Label>
        {accepted.length === 0 && outgoing.length === 0 && <div className="text-center py-6"><p className="text-white/25 text-sm">No friends yet.</p><p className="text-white/20 text-xs mt-1">Reveal during a match to connect.</p></div>}
        {accepted.map((f) => (
          <button key={f.id} onClick={() => onOpenConvo(f.userId)} className="w-full flex items-center gap-3 rounded-xl hover:bg-white/5 -mx-1 px-1 py-2 transition-all group text-left">
            <Avatar handle={f.handle} v={f.isVerifiedDev} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white group-hover:text-green transition-colors">{f.handle ? `@${f.handle}` : 'Anonymous'}</p>
              {f.lastMessage ? <p className="text-xs text-white/40 truncate">{f.lastMessage.senderId !== f.userId ? 'You: ' : ''}{f.lastMessage.content}</p> : <p className="text-xs text-white/25">No messages yet</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {(f.unreadCount ?? 0) > 0 && <span className="w-4 h-4 rounded-full bg-green text-white text-[9px] font-bold flex items-center justify-center">{f.unreadCount}</span>}
              <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </button>
        ))}
        {outgoing.map((f) => (
          <div key={f.id} className="flex items-center gap-3 opacity-50">
            <Avatar handle={f.handle} v={f.isVerifiedDev} />
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white">{f.handle ? `@${f.handle}` : 'Anonymous'}</p><p className="text-xs text-white/40">Request sent</p></div>
            <button onClick={() => decline(f.id)} className="text-xs text-white/30 hover:text-danger transition-colors px-1">Cancel</button>
          </div>
        ))}
      </section>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────────

function MessagesTab({ friends, loading, onOpenConvo }: {
  friends: Friend[]; loading: boolean; onOpenConvo: (id: string) => void;
}) {
  if (loading) return <Spinner />;
  const sorted = [...friends].sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta;
  });
  return (
    <div className="px-4 py-4">
      <div className="glass rounded-2xl overflow-hidden">
        {sorted.length === 0
          ? <div className="text-center py-10 px-4"><p className="text-white/25 text-sm">No messages yet.</p><p className="text-white/20 text-xs mt-1">Reveal during a match to add friends.</p></div>
          : <div className="divide-y divide-white/[0.06]">
              {sorted.map((f) => (
                <button key={f.id} onClick={() => onOpenConvo(f.userId)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-all group text-left">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${f.isVerifiedDev ? 'bg-green/15 border border-green/30 text-green' : 'bg-white/[0.08] border border-white/10 text-white/60'}`}>{f.handle ? f.handle[0].toUpperCase() : '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${(f.unreadCount ?? 0) > 0 ? 'text-white' : 'text-white/80'}`}>{f.handle ? `@${f.handle}` : 'Anonymous'}</p>
                      {f.lastMessage && <span className="text-[11px] text-white/25 shrink-0">{fmtTime(f.lastMessage.createdAt)}</span>}
                    </div>
                    {f.lastMessage ? <p className={`text-xs truncate ${(f.unreadCount ?? 0) > 0 ? 'text-white/60 font-medium' : 'text-white/35'}`}>{f.lastMessage.senderId !== f.userId ? 'You: ' : ''}{f.lastMessage.content}</p> : <p className="text-xs text-white/25">No messages yet</p>}
                  </div>
                  {(f.unreadCount ?? 0) > 0 && <span className="w-4 h-4 rounded-full bg-green text-white text-[9px] font-bold flex items-center justify-center shrink-0">{f.unreadCount}</span>}
                </button>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-green/60 transition-all';

function ProfileTab() {
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [revealHandle,  setRevealHandle]  = useState(true);
  const [revealBio,     setRevealBio]     = useState(true);
  const [revealGithub,  setRevealGithub]  = useState(true);
  const [revealTwitter, setRevealTwitter] = useState(true);
  const [revealEmail,   setRevealEmail]   = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/profile').then((r) => r.json()).then((d) => {
      setHandle(d.handle ?? ''); setBio(d.bio ?? ''); setGithubUrl(d.githubUrl ?? ''); setTwitterUrl(d.twitterUrl ?? ''); setContactEmail(d.contactEmail ?? ''); setTags(d.tags ?? []);
      setRevealHandle(d.revealHandle ?? true); setRevealBio(d.revealBio ?? true); setRevealGithub(d.revealGithub ?? true); setRevealTwitter(d.revealTwitter ?? true); setRevealEmail(d.revealEmail ?? true);
      setFetching(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess(false);
    const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle, bio, githubUrl, twitterUrl, contactEmail, tags, revealHandle, revealBio, revealGithub, revealTwitter, revealEmail }) });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? 'Failed to save'); else setSuccess(true);
    setLoading(false);
  }

  if (fetching) return <Spinner />;

  return (
    <form onSubmit={handleSave} className="px-4 py-4 space-y-4">
      {/* Identity */}
      <section className="glass rounded-2xl p-4 space-y-4">
        <Label>Identity</Label>
        <PField label="Handle *">
          <div className="flex items-center bg-white/[0.06] border border-white/[0.1] rounded-xl overflow-hidden focus-within:border-green/60 transition-all">
            <span className="px-3 text-white/30 font-mono text-sm select-none">@</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="your_handle" required maxLength={30} pattern="[a-zA-Z0-9_]+" className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-white focus:outline-none" />
          </div>
        </PField>
        <PField label="Bio">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you building?" maxLength={200} rows={2} className={`${inputCls} resize-none`} />
          <p className="text-white/20 text-xs font-mono text-right mt-0.5">{bio.length}/200</p>
        </PField>
      </section>

      {/* Links */}
      <section className="glass rounded-2xl p-4 space-y-3">
        <Label>Links</Label>
        <PField label="GitHub"><input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/you" type="url" className={inputCls} /></PField>
        <PField label="Twitter / X"><input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/you" type="url" className={inputCls} /></PField>
        <PField label="Contact email"><input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" type="email" className={inputCls} /></PField>
      </section>

      {/* Reveal settings */}
      <section className="glass rounded-2xl p-4 space-y-3">
        <Label>Reveal settings</Label>
        <Tog enabled={revealHandle}  onChange={setRevealHandle}  label="Handle"        hint="Your @username" />
        <Tog enabled={revealBio}     onChange={setRevealBio}     label="Bio"           hint="Your intro text" />
        <Tog enabled={revealGithub}  onChange={setRevealGithub}  label="GitHub"        hint="Profile URL" />
        <Tog enabled={revealTwitter} onChange={setRevealTwitter} label="Twitter / X"   hint="Profile URL" />
        <Tog enabled={revealEmail}   onChange={setRevealEmail}   label="Contact email" hint="Email address" />
      </section>

      {/* Interests */}
      <section className="glass rounded-2xl p-4 space-y-3">
        <Label>Interests</Label>
        <TagSelector selected={tags} onChange={setTags} />
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pb-2">
        <div>
          {error   && <p className="text-danger text-xs">{error}</p>}
          {success && <p className="text-green text-xs">Saved ✓</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="bg-danger/15 border border-danger/30 text-danger font-semibold rounded-xl px-4 py-2 text-sm hover:bg-danger/25 transition-all">Sign out</button>
          <button type="submit" disabled={loading} className="bg-green text-white font-semibold rounded-xl px-5 py-2 text-sm hover:bg-green-dim transition-all disabled:opacity-50 shadow-green-glow">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </form>
  );
}

// ── Micro components ──────────────────────────────────────────────────────────

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" /></div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-white/35 uppercase tracking-widest">{children}</h3>;
}
function PField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="block text-xs font-medium text-white/40 uppercase tracking-wider">{label}</label>{children}</div>;
}
function Tog({ enabled, onChange, label, hint }: { enabled: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <div className="min-w-0"><div className="text-sm text-white/70">{label}</div>{hint && <div className="text-xs text-white/30">{hint}</div>}</div>
      <button type="button" onClick={() => onChange(!enabled)} className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${enabled ? 'bg-green' : 'bg-white/10'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
function Avatar({ handle, v }: { handle: string | null; v: boolean }) {
  return <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${v ? 'bg-green/15 border border-green/30 text-green' : 'bg-white/[0.08] border border-white/10 text-white/60'}`}>{handle ? handle[0].toUpperCase() : '?'}</div>;
}
function IdentityRow({ icon, label, value, href, badge }: { icon: React.ReactNode; label: string; value: string; href?: string; badge?: string }) {
  const inner = <div className="flex items-center gap-3"><div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-xs shrink-0">{icon}</div><div className="flex-1 min-w-0"><div className="text-[11px] text-white/35 uppercase tracking-wide font-medium">{label}</div><div className="text-sm text-white/80 truncate">{value}</div></div>{badge && <span className="text-[11px] text-green font-mono border border-green/30 rounded-full px-2 py-0.5 shrink-0">{badge}</span>}</div>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">{inner}</a>;
  return <div>{inner}</div>;
}
function DIcon() { return <div className="w-6 h-6 rounded-lg bg-danger/15 border border-danger/25 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>; }
function LinkIcon() { return <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>; }
function CheckIcon({ small }: { small?: boolean }) { return <svg className={small ? 'w-3.5 h-3.5 text-green' : 'w-3.5 h-3.5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function GithubIcon() { return <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>; }

function fmtTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return 'now';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtDate(iso: string) {
  const d = new Date(iso), diff = Date.now() - d.getTime();
  if (diff < 86_400_000) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

'use client';
import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ThemeSelector from '@/components/ThemeSelector';
import { useMatch } from '@/hooks/useMatch';
import VideoGrid from '@/components/VideoGrid';
import ChatPanel from '@/components/ChatPanel';
import Controls from '@/components/Controls';
import WaitingScreen from '@/components/WaitingScreen';
import TagSelector from '@/components/TagSelector';
import { ChatMessage, ReportCategory, RevealedIdentity } from '@/types';

// ── Root page — session guard ─────────────────────────────────────────────────

export default function MatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  if (status === 'loading' || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-green border-t-transparent animate-spin" />
      </div>
    }>
      <MatchPageInner userId={session.user.id} handle={session.user.handle} />
    </Suspense>
  );
}

// ── Demo vs live router ───────────────────────────────────────────────────────

function MatchPageInner({ userId, handle }: { userId: string; handle?: string }) {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';
  if (isDemo) return <DemoMatchView handle={handle} />;
  return <LiveMatchView userId={userId} handle={handle} />;
}

// ── Shared nav header ─────────────────────────────────────────────────────────

function MatchHeader({
  handle,
  unreadCount = 0,
  pendingRequests = 0,
  badge,
}: {
  handle?: string;
  unreadCount?: number;
  pendingRequests?: number;
  badge?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-5 py-3 glass border-b border-white/[0.08] shrink-0 z-10">
      <Link href="/" className="text-base font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
        book<span className="text-green">face</span>
      </Link>
      <div className="flex items-center gap-1.5">
        {handle && <span className="text-sm text-white/40 font-mono mr-1">@{handle}</span>}
        {badge}
        <Link href="/friends" title="Friends" className="relative w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {pendingRequests > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white text-base text-[9px] font-bold flex items-center justify-center">{pendingRequests}</span>
          )}
        </Link>
        <Link href="/messages" title="Messages" className="relative w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-green text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
          )}
        </Link>
        <Link href="/profile" title="Profile" className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </Link>
        <ThemeSelector />
        <button onClick={() => signOut({ callbackUrl: '/' })} title="Sign out" className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/30 hover:text-danger transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

// ── Demo view (offline UI preview) ────────────────────────────────────────────

const DEMO_MESSAGES: ChatMessage[] = [
  { id: '1', fromSelf: false, text: 'Hey! What are you building?',          timestamp: Date.now() - 90000 },
  { id: '2', fromSelf: true,  text: 'Working on a WebRTC app actually 😄',  timestamp: Date.now() - 75000 },
  { id: '3', fromSelf: false, text: 'No way, same! Small world 🌍',          timestamp: Date.now() - 60000 },
  { id: '4', fromSelf: true,  text: 'What stack are you using?',             timestamp: Date.now() - 45000 },
  { id: '5', fromSelf: false, text: 'Next.js + Prisma + Railway. You?',      timestamp: Date.now() - 30000 },
];

function DemoMatchView({ handle }: { handle?: string }) {
  const [splitPercent, setSplitPercent] = useState(42);
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [rightPanel, setRightPanel] = useState<RightPanelKind>('chat');
  const isDividerDragging = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDividerDragging.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(22, Math.min(78, pct)));
    }
    function onMouseUp() { isDividerDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const demoBadge = (
    <span className="text-[10px] font-bold text-white/40 border border-white/20 rounded-md px-1.5 py-0.5 tracking-wider mr-1">DEMO</span>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <MatchHeader handle={handle} badge={demoBadge} />
      <div ref={splitContainerRef} className="flex-1 flex overflow-hidden">
        <div style={{ width: `${splitPercent}%` }} className="flex flex-col p-3 gap-3 min-w-0 shrink-0">
          <VideoGrid localStream={null} remoteStream={null} isVideoOff={false} isAudioMuted={false} isScreenSharing={false} />
          <Controls
            isAudioMuted={false} isVideoOff={false} isScreenSharing={false}
            onToggleMute={() => {}} onToggleVideo={() => {}} onToggleScreenShare={() => {}}
            onSkip={() => {}}
            onReveal={() => setRightPanel('reveal-incoming')}
            onReport={() => setRightPanel('report')}
            revealPending={false} revealedIdentity={false} sessionActive={true}
          />
        </div>
        <div onMouseDown={() => { isDividerDragging.current = true; }} className="w-1 shrink-0 bg-white/[0.05] hover:bg-green/30 cursor-col-resize transition-colors select-none" />
        <div className="flex-1 min-w-0 flex flex-col">
          {rightPanel === 'chat' && (
            <ChatPanel messages={messages} onSend={(t) => setMessages((p) => [...p, { id: String(Date.now()), fromSelf: true, text: t, timestamp: Date.now() }])} />
          )}
          {rightPanel === 'report' && (
            <ReportPanel onReport={() => setRightPanel('chat')} onClose={() => setRightPanel('chat')} />
          )}
          {rightPanel === 'reveal-outgoing' && (
            <RevealOutgoingPanel onBack={() => setRightPanel('chat')} />
          )}
          {rightPanel === 'reveal-incoming' && (
            <RevealIncomingPanel
              onAccept={() => setRightPanel('reveal-identity')}
              onDecline={() => setRightPanel('chat')}
            />
          )}
          {rightPanel === 'reveal-identity' && (
            <RevealIdentityPanel identity={DEMO_IDENTITY} onClose={() => setRightPanel('chat')} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Live view (real WebRTC) ───────────────────────────────────────────────────

type RightPanelKind = 'chat' | 'report' | 'reveal-outgoing' | 'reveal-incoming' | 'reveal-identity';

function LiveMatchView({ userId, handle }: { userId: string; handle?: string }) {
  const {
    sessionState, localStream, remoteStream,
    isAudioMuted, isVideoOff, isScreenSharing,
    messages, incomingReveal, revealPending, revealedIdentity,
    errorMsg, selectedTags,
    startMatching, skip, stopMatching, sendMessage,
    requestReveal, respondToReveal, reportUser,
    toggleMute, toggleVideo, toggleScreenShare,
    setSelectedTags, clearError, dismissReveal,
  } = useMatch({ userId });

  const [splitPercent, setSplitPercent] = useState(42);
  const isDividerDragging = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [rightPanel, setRightPanel] = useState<RightPanelKind>('chat');

  const refreshCounts = useCallback(() => {
    fetch('/api/friends').then((r) => r.json()).then((data) => {
      if (!Array.isArray(data)) return;
      setUnreadCount(data.reduce((n: number, f: { unreadCount?: number }) => n + (f.unreadCount ?? 0), 0));
      setPendingRequests(data.filter((f: { status: string; iRequested: boolean }) => f.status === 'PENDING' && !f.iRequested).length);
    });
  }, []);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  // Auto-switch panel when reveal state arrives from the other side
  useEffect(() => {
    if (incomingReveal && !revealedIdentity) setRightPanel('reveal-incoming');
  }, [incomingReveal, revealedIdentity]);

  useEffect(() => {
    if (revealedIdentity) setRightPanel('reveal-identity');
  }, [revealedIdentity]);

  // Reset panel when session ends / resets
  useEffect(() => {
    if (sessionState === 'idle' || sessionState === 'waiting' || sessionState === 'ended') {
      setRightPanel('chat');
    }
  }, [sessionState]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDividerDragging.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(22, Math.min(78, pct)));
    }
    function onMouseUp() { isDividerDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  function handleReveal() {
    requestReveal();
    setRightPanel('reveal-outgoing');
  }

  function handleReport() {
    setRightPanel('report');
  }

  const isActive = sessionState === 'active' || sessionState === 'connecting';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <MatchHeader handle={handle} unreadCount={unreadCount} pendingRequests={pendingRequests} />

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-danger/10 border-b border-danger/20 px-5 py-2.5 text-sm text-danger shrink-0 flex items-center justify-between gap-4">
          <span>{errorMsg}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { clearError(); startMatching(selectedTags); }} className="text-xs border border-danger/40 rounded-lg px-2.5 py-1 hover:bg-danger/15 transition-colors">Retry</button>
            <button onClick={clearError} className="text-xs text-danger/60 hover:text-danger transition-colors">✕</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">

        {/* Idle */}
        {sessionState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Ready to match?</h2>
              <p className="text-white/50 text-[15px]">Pick tags to find your kind of coder, or go random</p>
            </div>
            <div className="w-full max-w-md glass rounded-3xl p-6 shadow-glass space-y-5">
              <div>
                <p className="text-sm font-medium text-white/60 mb-3">Interest tags <span className="text-white/30 font-normal">(optional)</span></p>
                <TagSelector selected={selectedTags} onChange={setSelectedTags} />
              </div>
              <button onClick={() => startMatching(selectedTags)} className="w-full bg-green text-white font-semibold rounded-2xl py-3.5 text-[15px] hover:bg-green-dim transition-all hover:scale-[1.01] active:scale-[0.99] shadow-green-glow">
                Find a match →
              </button>
            </div>
            {!handle && (
              <p className="text-sm text-white/30">
                <Link href="/profile" className="text-green hover:underline">Set up your profile</Link>{' '}so you're ready when you connect
              </p>
            )}
          </div>
        )}

        {/* Waiting */}
        {sessionState === 'waiting' && <WaitingScreen onCancel={stopMatching} selectedTags={selectedTags} />}

        {/* Active / connecting */}
        {isActive && (
          <div ref={splitContainerRef} className="flex-1 flex overflow-hidden">
            {/* Video column */}
            <div style={{ width: `${splitPercent}%` }} className="flex flex-col p-3 gap-3 min-w-0 shrink-0">
              <VideoGrid
                localStream={localStream} remoteStream={remoteStream}
                isVideoOff={isVideoOff} isAudioMuted={isAudioMuted} isScreenSharing={isScreenSharing}
              />
              <Controls
                isAudioMuted={isAudioMuted} isVideoOff={isVideoOff} isScreenSharing={isScreenSharing}
                onToggleMute={toggleMute} onToggleVideo={toggleVideo} onToggleScreenShare={toggleScreenShare}
                onSkip={skip}
                onReveal={handleReveal}
                onReport={handleReport}
                revealPending={revealPending}
                revealedIdentity={!!revealedIdentity}
                sessionActive={sessionState === 'active'}
              />
            </div>

            {/* Resizable divider */}
            <div onMouseDown={() => { isDividerDragging.current = true; }} className="w-1 shrink-0 bg-white/[0.05] hover:bg-green/30 cursor-col-resize transition-colors select-none" />

            {/* Right column — chat or panel */}
            <div className="flex-1 min-w-0 flex flex-col">
              {rightPanel === 'chat' && <ChatPanel messages={messages} onSend={sendMessage} />}
              {rightPanel === 'report' && (
                <ReportPanel
                  onReport={(cat) => { reportUser(cat); setRightPanel('chat'); }}
                  onClose={() => setRightPanel('chat')}
                />
              )}
              {rightPanel === 'reveal-outgoing' && (
                <RevealOutgoingPanel onBack={() => setRightPanel('chat')} />
              )}
              {rightPanel === 'reveal-incoming' && (
                <RevealIncomingPanel
                  onAccept={() => respondToReveal(true)}
                  onDecline={() => { respondToReveal(false); setRightPanel('chat'); }}
                />
              )}
              {rightPanel === 'reveal-identity' && revealedIdentity && (
                <RevealIdentityPanel
                  identity={revealedIdentity}
                  onClose={() => { dismissReveal(); setRightPanel('chat'); }}
                />
              )}
            </div>
          </div>
        )}

        {/* Ended */}
        {sessionState === 'ended' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="glass rounded-3xl p-8 text-center space-y-4 shadow-glass max-w-xs w-full">
              <div className="text-5xl">👋</div>
              <div>
                <h2 className="font-bold text-white text-xl tracking-tight">Session ended</h2>
                <p className="text-white/40 text-sm mt-1">They disconnected or skipped</p>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => startMatching(selectedTags)} className="flex-1 bg-green text-white font-semibold rounded-2xl py-3 text-sm hover:bg-green-dim transition-all shadow-green-glow">Next →</button>
                <button onClick={stopMatching} className="flex-1 glass rounded-2xl py-3 text-white/60 hover:text-white text-sm font-medium transition-all">Stop</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Right-side panels ─────────────────────────────────────────────────────────

function PanelHeader({ icon, title, onClose }: { icon: React.ReactNode; title: string; onClose?: () => void }) {
  return (
    <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm font-medium text-white">{title}</span>
      </div>
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

// Report panel
const REPORT_CATEGORIES: { value: ReportCategory; label: string; desc: string }[] = [
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content', desc: 'Nudity, sexual content, or disturbing material' },
  { value: 'HARASSMENT',            label: 'Harassment',            desc: 'Bullying, threats, or targeted abuse' },
  { value: 'SPAM',                  label: 'Spam / bot',            desc: 'Automated behavior or repeated irrelevant content' },
];

function ReportPanel({ onReport, onClose }: { onReport: (cat: ReportCategory) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<ReportCategory | null>(null);

  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      <PanelHeader
        icon={<div className="w-6 h-6 rounded-lg bg-danger/15 border border-danger/25 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>}
        title="Report user"
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-white/50 text-sm leading-relaxed">Select a reason. This will end the session and block this user.</p>
        <div className="space-y-2 pt-1">
          {REPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelected(cat.value)}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all ${selected === cat.value ? 'border-danger/60 bg-danger/10' : 'glass hover:border-white/20'}`}
            >
              <div className="text-sm font-medium text-white">{cat.label}</div>
              <div className="text-xs text-white/40 mt-0.5">{cat.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.08] flex gap-2.5">
        <button onClick={onClose} className="flex-1 py-3 rounded-2xl glass text-white/70 hover:text-white font-medium text-sm transition-all">Cancel</button>
        <button onClick={() => selected && onReport(selected)} disabled={!selected} className="flex-1 py-3 rounded-2xl bg-danger text-white font-semibold text-sm hover:bg-red-600 transition-all disabled:opacity-30">
          Report
        </button>
      </div>
    </div>
  );
}

// Reveal outgoing — waiting for the other person to accept
function RevealOutgoingPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      <PanelHeader
        icon={<div className="w-6 h-6 rounded-lg bg-green/15 border border-green/25 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>}
        title="Reveal request sent"
      />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-green/30 border-t-green animate-spin" />
        <div>
          <p className="text-white/80 font-medium">Waiting for them to accept…</p>
          <p className="text-white/40 text-sm mt-1">You'll see their profile as soon as they agree.</p>
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.08]">
        <button onClick={onBack} className="w-full py-3 rounded-2xl glass text-white/60 hover:text-white font-medium text-sm transition-all">
          ← Back to chat
        </button>
      </div>
    </div>
  );
}

// Reveal incoming — they want to connect with you
function RevealIncomingPanel({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      <PanelHeader
        icon={<div className="w-6 h-6 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>}
        title="They want to connect"
      />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-2xl">🤝</div>
        <div>
          <p className="text-white/80 font-medium">Reveal your identity?</p>
          <p className="text-white/40 text-sm mt-1.5 leading-relaxed max-w-[200px]">
            You'll each share whatever info you've chosen in your profile settings.
          </p>
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.08] flex gap-2.5">
        <button onClick={onDecline} className="flex-1 py-3 rounded-2xl glass text-white/70 hover:text-white font-medium text-sm transition-all">Decline</button>
        <button onClick={onAccept} className="flex-1 py-3 rounded-2xl bg-green text-white font-semibold text-sm hover:bg-green-dim transition-all shadow-green-glow">Reveal ✓</button>
      </div>
    </div>
  );
}

// Reveal identity — both agreed, show their profile
function RevealIdentityPanel({ identity, onClose }: { identity: RevealedIdentity; onClose: () => void }) {
  const [friendStatus, setFriendStatus] = useState<'idle' | 'loading' | 'sent' | 'friends'>('idle');

  async function sendFriendRequest() {
    setFriendStatus('loading');
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresseeId: identity.userId }),
    });
    const data = await res.json();
    if (res.ok) setFriendStatus(data.status === 'ACCEPTED' ? 'friends' : 'sent');
    else setFriendStatus(data.error === 'Already friends' ? 'friends' : 'sent');
  }

  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      <PanelHeader
        icon={<div className="w-6 h-6 rounded-lg bg-green/15 border border-green/25 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>}
        title="Identity revealed"
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="glass rounded-2xl p-4 space-y-3">
          {identity.handle && <IdentityRow icon="@" label="Handle" value={`@${identity.handle}`} />}
          {identity.bio && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-xs shrink-0">✦</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-white/35 uppercase tracking-wide font-medium">Bio</div>
                <div className="text-sm text-white/80 leading-relaxed">{identity.bio}</div>
              </div>
            </div>
          )}
          {identity.githubUrl && (
            <IdentityRow icon={<GithubIcon />} label="GitHub" value={identity.githubUrl} href={identity.githubUrl} badge={identity.isVerifiedDev ? 'verified dev ✓' : undefined} />
          )}
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
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            Add friend
          </button>
        )}
        {friendStatus === 'loading' && (
          <div className="flex-1 py-3 rounded-2xl glass text-white/40 text-sm flex items-center justify-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            Sending…
          </div>
        )}
        {friendStatus === 'sent' && (
          <div className="flex-1 py-3 rounded-2xl bg-green/10 border border-green/25 text-green text-sm flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Request sent
          </div>
        )}
        {friendStatus === 'friends' && (
          <div className="flex-1 py-3 rounded-2xl bg-green/10 border border-green/25 text-green text-sm flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Friends!
          </div>
        )}
        <button onClick={onClose} className="flex-1 py-3 rounded-2xl glass text-white/60 hover:text-white font-medium text-sm transition-all">Done</button>
      </div>
    </div>
  );
}

function IdentityRow({ icon, label, value, href, badge }: { icon: React.ReactNode; label: string; value: string; href?: string; badge?: string }) {
  const inner = (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-xs shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-white/35 uppercase tracking-wide font-medium">{label}</div>
        <div className="text-sm text-white/80 truncate">{value}</div>
      </div>
      {badge && <span className="text-[11px] text-green font-mono border border-green/30 rounded-full px-2 py-0.5 shrink-0">{badge}</span>}
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">{inner}</a>;
  return <div>{inner}</div>;
}

function GithubIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

// Demo identity for preview mode
const DEMO_IDENTITY: RevealedIdentity = {
  userId: 'demo-user',
  handle: 'rustacean42',
  bio: 'Building distributed systems in Rust. Obsessed with zero-cost abstractions.',
  githubUrl: 'https://github.com/rustacean42',
  twitterUrl: 'https://x.com/rustacean42',
  contactEmail: null,
  isVerifiedDev: true,
};

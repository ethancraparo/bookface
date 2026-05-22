'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ThemeSelector from '@/components/ThemeSelector';
import { useMatch } from '@/hooks/useMatch';
import VideoGrid from '@/components/VideoGrid';
import Controls from '@/components/Controls';
import WaitingScreen from '@/components/WaitingScreen';
import TagSelector from '@/components/TagSelector';
import RightPanel, { OverlayKind } from '@/components/RightPanel';
import Link from 'next/link';

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
  if (isDemo) return <DemoView handle={handle} />;
  return <LiveView userId={userId} handle={handle} />;
}

// ── Shared minimal header ─────────────────────────────────────────────────────

function AppHeader({ handle, badge }: { handle?: string; badge?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between px-5 py-3 glass border-b border-white/[0.08] shrink-0 z-10">
      <Link href="/" className="text-base font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
        book<span className="text-green">face</span>
      </Link>
      <div className="flex items-center gap-1.5">
        {handle && <span className="text-sm text-white/40 font-mono mr-1">@{handle}</span>}
        {badge}
        <ThemeSelector />
      </div>
    </header>
  );
}

// ── Live view ─────────────────────────────────────────────────────────────────

function LiveView({ userId, handle }: { userId: string; handle?: string }) {
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

  const [splitPercent, setSplitPercent] = useState(50);
  const isDividerDragging = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<OverlayKind>('none');

  // Drive overlay from match hook state
  useEffect(() => {
    if (incomingReveal && !revealedIdentity) setOverlay('reveal-incoming');
  }, [incomingReveal, revealedIdentity]);

  useEffect(() => {
    if (revealedIdentity) setOverlay('reveal-identity');
  }, [revealedIdentity]);

  useEffect(() => {
    if (sessionState === 'idle' || sessionState === 'waiting' || sessionState === 'ended') {
      setOverlay('none');
    }
  }, [sessionState]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDividerDragging.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(20, Math.min(75, pct)));
    }
    function onMouseUp() { isDividerDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const isActive = sessionState === 'active' || sessionState === 'connecting';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader handle={handle} />

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

      {/* Always-split main area */}
      <div ref={splitContainerRef} className="flex-1 flex overflow-hidden">

        {/* ── Left column ── */}
        <div style={{ width: `${splitPercent}%` }} className="flex flex-col shrink-0 min-w-0 overflow-hidden">

          {/* Idle — match CTA */}
          {sessionState === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-3xl font-black text-white tracking-tight">
                  book<span className="text-green">face</span>
                </h2>
                <p className="text-white/40 text-sm">Random video chat for vibe coders</p>
              </div>
              <div className="w-full max-w-sm glass rounded-3xl p-5 shadow-glass space-y-4">
                <p className="text-sm font-medium text-white/60">
                  Interest tags <span className="text-white/30 font-normal">(optional)</span>
                </p>
                <TagSelector selected={selectedTags} onChange={setSelectedTags} />
                <button
                  onClick={() => startMatching(selectedTags)}
                  className="w-full bg-green text-white font-semibold rounded-2xl py-3.5 text-[15px] hover:bg-green-dim transition-all hover:scale-[1.01] active:scale-[0.99] shadow-green-glow"
                >
                  Find a match →
                </button>
              </div>
            </div>
          )}

          {/* Waiting */}
          {sessionState === 'waiting' && (
            <WaitingScreen onCancel={stopMatching} selectedTags={selectedTags} />
          )}

          {/* Active / connecting — video + controls */}
          {isActive && (
            <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
              <VideoGrid
                localStream={localStream} remoteStream={remoteStream}
                isVideoOff={isVideoOff} isAudioMuted={isAudioMuted} isScreenSharing={isScreenSharing}
              />
              <Controls
                isAudioMuted={isAudioMuted} isVideoOff={isVideoOff} isScreenSharing={isScreenSharing}
                onToggleMute={toggleMute} onToggleVideo={toggleVideo} onToggleScreenShare={toggleScreenShare}
                onSkip={skip}
                onReveal={() => { requestReveal(); setOverlay('reveal-outgoing'); }}
                onReport={() => setOverlay('report')}
                revealPending={revealPending}
                revealedIdentity={!!revealedIdentity}
                sessionActive={sessionState === 'active'}
              />
            </div>
          )}

          {/* Ended */}
          {sessionState === 'ended' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
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

        {/* ── Resizable divider ── */}
        <div
          onMouseDown={() => { isDividerDragging.current = true; }}
          className="w-1 shrink-0 bg-white/[0.05] hover:bg-green/30 cursor-col-resize transition-colors select-none"
        />

        {/* ── Right column — always-visible RightPanel ── */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <RightPanel
            sessionActive={isActive}
            messages={messages}
            onSend={sendMessage}
            overlay={overlay}
            onClearOverlay={() => setOverlay('none')}
            revealedIdentity={revealedIdentity}
            onRespondToReveal={respondToReveal}
            onReportUser={(cat) => { reportUser(cat); setOverlay('none'); }}
            onDismissReveal={() => { dismissReveal(); setOverlay('none'); }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Demo view (offline preview) ───────────────────────────────────────────────

const DEMO_MESSAGES = [
  { id: '1', fromSelf: false, text: 'Hey! What are you building?',         timestamp: Date.now() - 90000 },
  { id: '2', fromSelf: true,  text: 'Working on a WebRTC app actually 😄', timestamp: Date.now() - 75000 },
  { id: '3', fromSelf: false, text: 'No way, same! Small world 🌍',         timestamp: Date.now() - 60000 },
];

function DemoView({ handle }: { handle?: string }) {
  const [splitPercent, setSplitPercent] = useState(50);
  const [overlay, setOverlay] = useState<OverlayKind>('none');
  const isDividerDragging = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDividerDragging.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      setSplitPercent(Math.max(20, Math.min(75, ((e.clientX - rect.left) / rect.width) * 100)));
    }
    function onMouseUp() { isDividerDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const demoBadge = <span className="text-[10px] font-bold text-white/40 border border-white/20 rounded-md px-1.5 py-0.5 tracking-wider mr-1">DEMO</span>;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader handle={handle} badge={demoBadge} />
      <div ref={splitContainerRef} className="flex-1 flex overflow-hidden">
        <div style={{ width: `${splitPercent}%` }} className="flex flex-col shrink-0 min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
            <VideoGrid localStream={null} remoteStream={null} isVideoOff={false} isAudioMuted={false} isScreenSharing={false} />
            <Controls
              isAudioMuted={false} isVideoOff={false} isScreenSharing={false}
              onToggleMute={() => {}} onToggleVideo={() => {}} onToggleScreenShare={() => {}}
              onSkip={() => {}}
              onReveal={() => setOverlay('reveal-incoming')}
              onReport={() => setOverlay('report')}
              revealPending={false} revealedIdentity={false} sessionActive={true}
            />
          </div>
        </div>
        <div onMouseDown={() => { isDividerDragging.current = true; }} className="w-1 shrink-0 bg-white/[0.05] hover:bg-green/30 cursor-col-resize transition-colors select-none" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <RightPanel
            sessionActive={true}
            messages={DEMO_MESSAGES}
            onSend={() => {}}
            overlay={overlay}
            onClearOverlay={() => setOverlay('none')}
            revealedIdentity={null}
            onRespondToReveal={() => {}}
            onReportUser={() => { setOverlay('none'); }}
            onDismissReveal={() => setOverlay('none')}
          />
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMatch } from '@/hooks/useMatch';
import VideoGrid from '@/components/VideoGrid';
import ChatPanel from '@/components/ChatPanel';
import Controls from '@/components/Controls';
import WaitingScreen from '@/components/WaitingScreen';
import RevealModal from '@/components/RevealModal';
import ReportModal from '@/components/ReportModal';
import TagSelector from '@/components/TagSelector';

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

  return <MatchPageInner userId={session.user.id} handle={session.user.handle} />;
}

function MatchPageInner({ userId, handle }: { userId: string; handle?: string }) {
  const {
    sessionState, localStream, remoteStream,
    isAudioMuted, isVideoOff, isScreenSharing,
    messages, incomingReveal, revealPending, revealedIdentity,
    showReport, errorMsg, selectedTags,
    startMatching, skip, stopMatching, sendMessage,
    requestReveal, respondToReveal, reportUser,
    toggleMute, toggleVideo, toggleScreenShare,
    setShowReport, setSelectedTags, clearError, dismissReveal,
  } = useMatch({ userId });

  const [splitPercent, setSplitPercent] = useState(42);
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
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const isActive = sessionState === 'active' || sessionState === 'connecting';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header — glass menu bar */}
      <header className="flex items-center justify-between px-5 py-3 glass border-b border-white/[0.08] shrink-0 z-10">
        <Link href="/" className="text-base font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
          book<span className="text-green">face</span>
        </Link>
        <div className="flex items-center gap-3">
          {handle && (
            <span className="text-sm text-white/40 font-mono">@{handle}</span>
          )}
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
            title="Profile"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </Link>
        </div>
      </header>

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-danger/10 border-b border-danger/20 px-5 py-2.5 text-sm text-danger shrink-0 flex items-center justify-between gap-4">
          <span>{errorMsg}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { clearError(); startMatching(selectedTags); }}
              className="text-xs border border-danger/40 rounded-lg px-2.5 py-1 hover:bg-danger/15 transition-colors"
            >
              Retry
            </button>
            <button onClick={clearError} className="text-xs text-danger/60 hover:text-danger transition-colors">✕</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── Idle ── */}
        {sessionState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Ready to match?</h2>
              <p className="text-white/50 text-[15px]">
                Pick tags to find your kind of coder, or go random
              </p>
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
                <Link href="/profile" className="text-green hover:underline">Set up your profile</Link>
                {' '}so you're ready when you connect
              </p>
            )}
          </div>
        )}

        {/* ── Waiting ── */}
        {sessionState === 'waiting' && (
          <WaitingScreen onCancel={stopMatching} selectedTags={selectedTags} />
        )}

        {/* ── Active / connecting ── */}
        {isActive && (
          <div ref={splitContainerRef} className="flex-1 flex overflow-hidden">
            {/* Video column */}
            <div style={{ width: `${splitPercent}%` }} className="flex flex-col p-3 gap-3 min-w-0 shrink-0">
              <VideoGrid
                localStream={localStream}
                remoteStream={remoteStream}
                isVideoOff={isVideoOff}
                isAudioMuted={isAudioMuted}
                isScreenSharing={isScreenSharing}
              />
              <Controls
                isAudioMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                isScreenSharing={isScreenSharing}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={toggleScreenShare}
                onSkip={skip}
                onReveal={requestReveal}
                onReport={() => setShowReport(true)}
                revealPending={revealPending}
                revealedIdentity={!!revealedIdentity}
                sessionActive={sessionState === 'active'}
              />
            </div>

            {/* Resizable divider */}
            <div
              onMouseDown={() => { isDividerDragging.current = true; }}
              className="w-1 shrink-0 bg-white/[0.05] hover:bg-green/30 cursor-col-resize transition-colors select-none"
            />

            {/* Chat column */}
            <div className="flex-1 min-w-0 flex flex-col">
              <ChatPanel messages={messages} onSend={sendMessage} />
            </div>
          </div>
        )}

        {/* ── Ended ── */}
        {sessionState === 'ended' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="glass rounded-3xl p-8 text-center space-y-4 shadow-glass max-w-xs w-full">
              <div className="text-5xl">👋</div>
              <div>
                <h2 className="font-bold text-white text-xl tracking-tight">Session ended</h2>
                <p className="text-white/40 text-sm mt-1">They disconnected or skipped</p>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => startMatching(selectedTags)}
                  className="flex-1 bg-green text-white font-semibold rounded-2xl py-3 text-sm hover:bg-green-dim transition-all shadow-green-glow"
                >
                  Next →
                </button>
                <button
                  onClick={stopMatching}
                  className="flex-1 glass rounded-2xl py-3 text-white/60 hover:text-white text-sm font-medium transition-all"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {incomingReveal && !revealedIdentity && (
        <RevealModal mode="incoming" onAccept={() => respondToReveal(true)} onDecline={() => respondToReveal(false)} />
      )}
      {revealedIdentity && (
        <RevealModal mode="identity" identity={revealedIdentity} onClose={dismissReveal} />
      )}
      {showReport && (
        <ReportModal onReport={reportUser} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

'use client';
import { useEffect } from 'react';
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
        <span className="font-mono text-text-muted animate-pulse">loading...</span>
      </div>
    );
  }

  return <MatchPageInner userId={session.user.id} handle={session.user.handle} />;
}

function MatchPageInner({ userId, handle }: { userId: string; handle?: string }) {
  const {
    sessionState,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoOff,
    messages,
    incomingReveal,
    revealPending,
    revealedIdentity,
    showReport,
    errorMsg,
    selectedTags,
    startMatching,
    skip,
    stopMatching,
    sendMessage,
    requestReveal,
    respondToReveal,
    reportUser,
    toggleMute,
    toggleVideo,
    setShowReport,
    setSelectedTags,
    clearError,
  } = useMatch({ userId });

  const isActive = sessionState === 'active' || sessionState === 'connecting';

  return (
    <div className="h-screen flex flex-col bg-base overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface shrink-0">
        <Link href="/" className="font-mono text-base font-bold text-green">
          bookface
        </Link>
        <div className="flex items-center gap-3">
          {handle && (
            <span className="text-xs font-mono text-text-muted">
              @{handle}
            </span>
          )}
          <Link
            href="/profile"
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ⚙ profile
          </Link>
        </div>
      </header>

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-danger/10 border-b border-danger/30 px-4 py-2 text-sm text-danger font-mono shrink-0 flex items-center justify-between gap-4">
          <span>{errorMsg}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { clearError(); startMatching(selectedTags); }}
              className="text-xs border border-danger/40 rounded px-2 py-0.5 hover:bg-danger/20 transition-colors"
            >
              retry
            </button>
            <button
              onClick={clearError}
              className="text-xs text-danger/60 hover:text-danger transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Idle: setup screen */}
        {sessionState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center">
              <h2 className="font-mono text-xl font-bold text-text-primary">
                ready to match?
              </h2>
              <p className="text-text-muted text-sm mt-1">
                pick tags to find your kind of vibe coder, or go random
              </p>
            </div>

            <div className="w-full max-w-lg bg-surface border border-border rounded-xl p-5 space-y-4">
              <div>
                <p className="text-xs font-mono text-text-muted mb-2">
                  interest tags{' '}
                  <span className="text-text-dim">(optional)</span>
                </p>
                <TagSelector selected={selectedTags} onChange={setSelectedTags} />
              </div>

              <button
                onClick={() => startMatching(selectedTags)}
                className="w-full bg-green text-base font-bold rounded-xl py-3 text-base hover:bg-green-dim transition-all hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_30px_#22c55e22]"
              >
                find a match →
              </button>
            </div>

            {!handle && (
              <p className="text-xs text-text-muted font-mono">
                <Link href="/profile" className="text-cyan hover:underline">
                  set up your profile
                </Link>{' '}
                so you're ready when you connect
              </p>
            )}
          </div>
        )}

        {/* Waiting */}
        {sessionState === 'waiting' && (
          <WaitingScreen onCancel={stopMatching} selectedTags={selectedTags} />
        )}

        {/* Active / connecting */}
        {isActive && (
          <div className="flex-1 flex overflow-hidden">
            {/* Video area */}
            <div className="flex-1 flex flex-col p-3 gap-3 min-w-0">
              <VideoGrid
                localStream={localStream}
                remoteStream={remoteStream}
                isVideoOff={isVideoOff}
                isAudioMuted={isAudioMuted}
              />
              <Controls
                isAudioMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onSkip={skip}
                onReveal={requestReveal}
                onReport={() => setShowReport(true)}
                revealPending={revealPending}
                revealedIdentity={!!revealedIdentity}
                sessionActive={sessionState === 'active'}
              />
            </div>

            {/* Chat panel */}
            <div className="w-72 shrink-0 flex flex-col border-l border-border">
              <ChatPanel messages={messages} onSend={sendMessage} />
            </div>
          </div>
        )}

        {/* Session ended */}
        {sessionState === 'ended' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="text-center space-y-2">
              <div className="text-4xl">👋</div>
              <h2 className="font-mono text-lg font-bold text-text-primary">session ended</h2>
              <p className="text-text-muted text-sm">they disconnected or skipped</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startMatching(selectedTags)}
                className="bg-green text-base font-semibold rounded-xl px-6 py-2.5 hover:bg-green-dim transition-colors"
              >
                find next →
              </button>
              <button
                onClick={stopMatching}
                className="border border-border rounded-xl px-6 py-2.5 text-text-muted hover:bg-elevated transition-colors text-sm"
              >
                stop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {incomingReveal && !revealedIdentity && (
        <RevealModal
          mode="incoming"
          onAccept={() => respondToReveal(true)}
          onDecline={() => respondToReveal(false)}
        />
      )}

      {revealedIdentity && (
        <RevealModal
          mode="identity"
          identity={revealedIdentity}
          onClose={() => {}}
        />
      )}

      {showReport && (
        <ReportModal
          onReport={reportUser}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

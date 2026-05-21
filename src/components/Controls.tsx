'use client';

interface Props {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onSkip: () => void;
  onReveal: () => void;
  onReport: () => void;
  revealPending: boolean;
  revealedIdentity: boolean;
  sessionActive: boolean;
}

export default function Controls({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onSkip,
  onReveal,
  onReport,
  revealPending,
  revealedIdentity,
  sessionActive,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 glass rounded-2xl shadow-glass inset-highlight">
      {/* Left: Skip */}
      <button
        onClick={onSkip}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
      >
        <SkipIcon />
        skip
      </button>

      {/* Center: A/V controls */}
      <div className="flex items-center gap-1.5">
        <CtrlBtn
          onClick={onToggleMute}
          active={isAudioMuted}
          tooltip={isAudioMuted ? 'unmute' : 'mute'}
          activeClass="bg-danger/90 border-transparent text-white"
          icon={isAudioMuted ? <MicOffIcon /> : <MicIcon />}
        />
        <CtrlBtn
          onClick={onToggleVideo}
          active={isVideoOff}
          tooltip={isVideoOff ? 'show camera' : 'hide camera'}
          activeClass="bg-danger/90 border-transparent text-white"
          icon={isVideoOff ? <VideoOffIcon /> : <VideoIcon />}
        />
        <CtrlBtn
          onClick={onToggleScreenShare}
          active={isScreenSharing}
          tooltip={isScreenSharing ? 'stop sharing' : 'share screen'}
          activeClass="bg-green/20 border-green/50 text-green"
          icon={<ScreenIcon />}
        />
      </div>

      {/* Right: Reveal + Report */}
      <div className="flex items-center gap-1.5">
        {sessionActive && !revealedIdentity && (
          <button
            onClick={onReveal}
            disabled={revealPending}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              revealPending
                ? 'bg-blue/20 border border-blue/40 text-blue animate-pulse-slow'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <LinkIcon />
            {revealPending ? 'pending…' : 'reveal'}
          </button>
        )}
        {revealedIdentity && (
          <span className="flex items-center gap-1 px-3 py-2 text-sm text-green font-medium">
            <CheckIcon />
            connected
          </span>
        )}
        {sessionActive && (
          <button
            onClick={onReport}
            title="report user"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-danger hover:bg-danger/10 transition-all"
          >
            <FlagIcon />
          </button>
        )}
      </div>
    </div>
  );
}

function CtrlBtn({
  onClick, active, icon, activeClass, tooltip,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  activeClass: string;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
        active
          ? activeClass
          : 'border-transparent text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
    </button>
  );
}

// ── Icons ──────────────────────────────────────────────
function SkipIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19l7-7-7-7"/><path d="M13 19l7-7-7-7"/>
    </svg>
  );
}
function MicIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}
function MicOffIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  );
}
function VideoOffIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
function ScreenIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}

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
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface border-t border-border">
      {/* Left: Skip */}
      <button
        onClick={onSkip}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-muted hover:border-danger hover:text-danger transition-colors text-sm font-mono"
      >
        <span>⏭</span>
        skip
      </button>

      {/* Center: A/V + screen share */}
      <div className="flex items-center gap-2">
        <ControlBtn
          onClick={onToggleMute}
          active={isAudioMuted}
          activeLabel="🔇"
          inactiveLabel="🎤"
          activeClass="bg-danger border-danger text-white"
          tooltip={isAudioMuted ? 'unmute' : 'mute'}
        />
        <ControlBtn
          onClick={onToggleVideo}
          active={isVideoOff}
          activeLabel="🚫"
          inactiveLabel="📷"
          activeClass="bg-danger border-danger text-white"
          tooltip={isVideoOff ? 'show camera' : 'hide camera'}
        />
        <ControlBtn
          onClick={onToggleScreenShare}
          active={isScreenSharing}
          activeLabel="🖥️"
          inactiveLabel="🖥️"
          activeClass="bg-green/20 border-green text-green"
          tooltip={isScreenSharing ? 'stop sharing' : 'share screen'}
        />
      </div>

      {/* Right: Reveal + Report */}
      <div className="flex items-center gap-2">
        {sessionActive && !revealedIdentity && (
          <button
            onClick={onReveal}
            disabled={revealPending}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-mono transition-colors ${
              revealPending
                ? 'border-cyan text-cyan animate-pulse-slow'
                : 'border-border text-text-muted hover:border-cyan hover:text-cyan'
            }`}
          >
            <span>🔗</span>
            {revealPending ? 'pending...' : 'reveal'}
          </button>
        )}
        {revealedIdentity && (
          <span className="text-xs font-mono text-green flex items-center gap-1">
            <span>✓</span> connected
          </span>
        )}
        {sessionActive && (
          <button
            onClick={onReport}
            className="p-2 rounded-lg border border-border text-text-muted hover:border-danger hover:text-danger transition-colors text-sm"
            title="report user"
          >
            🚩
          </button>
        )}
      </div>
    </div>
  );
}

function ControlBtn({
  onClick,
  active,
  activeLabel,
  inactiveLabel,
  activeClass,
  tooltip,
}: {
  onClick: () => void;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeClass: string;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all text-base ${
        active
          ? activeClass
          : 'border-border text-text-muted hover:border-text-muted hover:bg-elevated'
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

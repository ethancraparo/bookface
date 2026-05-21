'use client';
import { RevealedIdentity } from '@/types';

interface IncomingProps {
  mode: 'incoming';
  onAccept: () => void;
  onDecline: () => void;
}

interface IdentityProps {
  mode: 'identity';
  identity: RevealedIdentity;
  onClose: () => void;
}

type Props = IncomingProps | IdentityProps;

export default function RevealModal(props: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-slide-up">
        {props.mode === 'incoming' ? (
          <IncomingReveal onAccept={props.onAccept} onDecline={props.onDecline} />
        ) : (
          <IdentityReveal identity={props.identity} onClose={props.onClose} />
        )}
      </div>
    </div>
  );
}

function IncomingReveal({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center mx-auto">
        <span className="text-xl">🔗</span>
      </div>
      <div>
        <h3 className="font-semibold text-text-primary">They want to connect</h3>
        <p className="text-text-muted text-sm mt-1">
          Reveal your identity? Both of you will see each other's handle, GitHub, Twitter, and contact email.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onDecline}
          className="flex-1 py-2.5 rounded-lg border border-border text-text-muted hover:border-danger hover:text-danger transition-colors text-sm"
        >
          decline
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-2.5 rounded-lg bg-green text-base font-semibold hover:bg-green-dim transition-colors text-sm"
        >
          reveal ✓
        </button>
      </div>
    </div>
  );
}

function IdentityReveal({ identity, onClose }: { identity: RevealedIdentity; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green/10 border border-green/30 flex items-center justify-center">
            <span className="text-sm">✓</span>
          </div>
          <h3 className="font-semibold text-text-primary">Identity revealed</h3>
        </div>
        <button onClick={onClose} className="text-text-dim hover:text-text-muted transition-colors">
          ✕
        </button>
      </div>

      <div className="bg-elevated rounded-xl p-4 space-y-3 border border-border">
        {identity.handle && (
          <Row icon="@" label="handle" value={`@${identity.handle}`} />
        )}
        {identity.githubUrl && (
          <Row
            icon="⚙"
            label="github"
            value={identity.githubUrl}
            href={identity.githubUrl}
            badge={identity.isVerifiedDev ? 'verified dev' : undefined}
          />
        )}
        {identity.twitterUrl && (
          <Row icon="𝕏" label="twitter" value={identity.twitterUrl} href={identity.twitterUrl} />
        )}
        {identity.contactEmail && (
          <Row icon="✉" label="email" value={identity.contactEmail} href={`mailto:${identity.contactEmail}`} />
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 text-sm text-text-muted hover:text-text-primary transition-colors font-mono"
      >
        close
      </button>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  href,
  badge,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
  badge?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3">
      <span className="text-text-dim w-4 text-center font-mono text-sm">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-dim font-mono">{label}</div>
        <div className="text-sm text-text-primary truncate">{value}</div>
      </div>
      {badge && (
        <span className="text-xs text-green font-mono border border-green/30 rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}

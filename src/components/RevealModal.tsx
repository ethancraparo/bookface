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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in p-4">
      <div className="glass-heavy rounded-3xl p-6 w-full max-w-sm shadow-glass-lg animate-slide-up">
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
    <div className="text-center space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-blue/15 border border-blue/25 flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </div>
      <div>
        <h3 className="font-semibold text-white text-[17px]">They want to connect</h3>
        <p className="text-white/50 text-sm mt-1.5 leading-relaxed">
          Reveal your identity? Both of you will see each other's handle, GitHub, Twitter, and contact email.
        </p>
      </div>
      <div className="flex gap-2.5 pt-1">
        <button
          onClick={onDecline}
          className="flex-1 py-3 rounded-2xl glass text-white/70 hover:text-white font-medium text-sm transition-all"
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-3 rounded-2xl bg-green text-white font-semibold text-sm hover:bg-green-dim transition-all shadow-green-glow"
        >
          Reveal ✓
        </button>
      </div>
    </div>
  );
}

function IdentityReveal({ identity, onClose }: { identity: RevealedIdentity; onClose: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green/15 border border-green/25 flex items-center justify-center">
            <svg className="w-4 h-4 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white text-[15px]">Identity revealed</h3>
            <p className="text-white/40 text-xs">Connected</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        {identity.handle && (
          <Row icon="@" label="Handle" value={`@${identity.handle}`} />
        )}
        {identity.githubUrl && (
          <Row
            icon={<GithubIcon />}
            label="GitHub"
            value={identity.githubUrl}
            href={identity.githubUrl}
            badge={identity.isVerifiedDev ? 'verified dev ✓' : undefined}
          />
        )}
        {identity.twitterUrl && (
          <Row icon="𝕏" label="Twitter" value={identity.twitterUrl} href={identity.twitterUrl} />
        )}
        {identity.contactEmail && (
          <Row icon="✉" label="Email" value={identity.contactEmail} href={`mailto:${identity.contactEmail}`} />
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-2xl glass text-white/60 hover:text-white font-medium text-sm transition-all"
      >
        Done
      </button>
    </div>
  );
}

function Row({
  icon, label, value, href, badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  badge?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-xs shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-white/35 uppercase tracking-wide font-medium">{label}</div>
        <div className="text-sm text-white/80 truncate">{value}</div>
      </div>
      {badge && (
        <span className="text-[11px] text-green font-mono border border-green/30 rounded-full px-2 py-0.5 shrink-0">
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

function GithubIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

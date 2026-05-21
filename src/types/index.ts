export type SessionState =
  | 'idle'
  | 'waiting'
  | 'connecting'
  | 'active'
  | 'ended';

export type ReportCategory =
  | 'INAPPROPRIATE_CONTENT'
  | 'HARASSMENT'
  | 'SPAM';

export interface ChatMessage {
  id: string;
  text: string;
  fromSelf: boolean;
  timestamp: number;
}

export interface RevealedIdentity {
  handle: string | null;
  bio: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
  contactEmail: string | null;
  isVerifiedDev: boolean;
}

export interface MatchState {
  sessionState: SessionState;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  messages: ChatMessage[];
  incomingReveal: boolean;
  revealPending: boolean;
  revealedIdentity: RevealedIdentity | null;
  showReport: boolean;
}

// Augment next-auth session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      handle?: string;
      isGithubLinked?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    handle?: string;
    isGithubLinked?: boolean;
    isBanned?: boolean;
  }
}

export const INTEREST_TAGS = [
  'React',
  'Vue',
  'Angular',
  'Svelte',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Python',
  'Rust',
  'Go',
  'Haskell',
  'Node.js',
  'Bun',
  'Deno',
  'AI/ML',
  'LLMs',
  'Web3',
  'DevOps',
  'Systems',
  'Mobile',
  'Games',
  'Open Source',
] as const;

export type InterestTag = (typeof INTEREST_TAGS)[number];

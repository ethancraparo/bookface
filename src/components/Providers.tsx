'use client';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './ThemeProvider';

// In local dev without a DB, inject a mock session so pages render
// without redirecting to sign-in. Remove or set NEXT_PUBLIC_DEV_BYPASS=""
// before deploying to production.
const DEV_SESSION =
  process.env.NEXT_PUBLIC_DEV_BYPASS === '1'
    ? {
        user: {
          id: 'dev-preview-user',
          email: 'dev@bookface.local',
          name: 'Dev User',
          handle: 'devuser',
          image: null,
        },
        expires: new Date(Date.now() + 86_400_000).toISOString(),
      }
    : undefined;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider session={DEV_SESSION}>{children}</SessionProvider>
    </ThemeProvider>
  );
}

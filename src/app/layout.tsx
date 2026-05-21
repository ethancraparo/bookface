import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'bookface — random video chat for vibe coders',
  description: 'Meet random developers over video. Skip or chat forever.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans text-text-primary min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

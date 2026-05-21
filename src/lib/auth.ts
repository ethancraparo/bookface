import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        if (user.isBanned) return null;
        if (user.bannedUntil && user.bannedUntil > new Date()) return null;

        return { id: user.id, email: user.email, name: user.handle };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      // Persist GitHub link status
      if (account?.provider === 'github') {
        token.isGithubLinked = true;
      }
      // Refresh handle + github status on each sign-in
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { accounts: { select: { provider: true } } },
        });
        if (dbUser) {
          token.handle = dbUser.handle ?? undefined;
          token.isGithubLinked = dbUser.accounts.some(
            (a) => a.provider === 'github'
          );
          token.isBanned = dbUser.isBanned;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.handle = token.handle as string | undefined;
      session.user.isGithubLinked = token.isGithubLinked as boolean | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

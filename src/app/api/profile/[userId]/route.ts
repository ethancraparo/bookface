import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/profile/[userId]
// Returns a user's public profile, filtered by their own reveal settings.
// Caller must be authenticated and must be an accepted friend of the target.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = session.user.id;
  const { userId } = await params;

  if (userId === me) return NextResponse.json({ error: 'Use /api/profile for your own profile' }, { status: 400 });

  // Must be accepted friends
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: me, addresseeId: userId },
        { requesterId: userId, addresseeId: me },
      ],
    },
  });
  if (!friendship) return NextResponse.json({ error: 'Not friends' }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      handle:       true,
      bio:          true,
      githubUrl:    true,
      twitterUrl:   true,
      contactEmail: true,
      revealHandle:  true,
      revealBio:     true,
      revealGithub:  true,
      revealTwitter: true,
      revealEmail:   true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    handle:       user.revealHandle  ? user.handle       : null,
    bio:          user.revealBio     ? user.bio          : null,
    githubUrl:    user.revealGithub  ? user.githubUrl    : null,
    twitterUrl:   user.revealTwitter ? user.twitterUrl   : null,
    contactEmail: user.revealEmail   ? user.contactEmail : null,
    isVerifiedDev: user.accounts.some((a) => a.provider === 'github'),
  });
}

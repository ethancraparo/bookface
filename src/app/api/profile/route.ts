import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      handle: true,
      bio: true,
      githubUrl: true,
      twitterUrl: true,
      contactEmail: true,
      tags: true,
      revealHandle: true,
      revealBio: true,
      revealGithub: true,
      revealTwitter: true,
      revealEmail: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...user,
    isGithubLinked: user.accounts.some((a) => a.provider === 'github'),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    handle, bio, githubUrl, twitterUrl, contactEmail, tags,
    revealHandle, revealBio, revealGithub, revealTwitter, revealEmail,
  } = await req.json();

  if (!handle || handle.length < 2 || handle.length > 30) {
    return NextResponse.json({ error: 'Handle must be 2–30 characters' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
    return NextResponse.json({ error: 'Handle can only contain letters, numbers, and underscores' }, { status: 400 });
  }

  const taken = await prisma.user.findFirst({
    where: { handle, NOT: { id: session.user.id } },
  });
  if (taken) {
    return NextResponse.json({ error: 'Handle already taken' }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      handle,
      bio: bio || null,
      githubUrl: githubUrl || null,
      twitterUrl: twitterUrl || null,
      contactEmail: contactEmail || null,
      tags: tags ?? [],
      revealHandle: revealHandle ?? true,
      revealBio: revealBio ?? true,
      revealGithub: revealGithub ?? true,
      revealTwitter: revealTwitter ?? true,
      revealEmail: revealEmail ?? true,
    },
  });

  return NextResponse.json({ ok: true, handle: updated.handle });
}

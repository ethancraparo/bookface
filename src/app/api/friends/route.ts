import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/friends — list accepted friends + pending requests
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = session.user.id;

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: me }, { addresseeId: me }],
    },
    include: {
      requester: { select: { id: true, handle: true, bio: true, accounts: { select: { provider: true } } } },
      addressee: { select: { id: true, handle: true, bio: true, accounts: { select: { provider: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // For accepted friends, attach latest message + unread count
  const result = await Promise.all(
    friendships.map(async (f) => {
      const other = f.requesterId === me ? f.addressee : f.requester;
      const iRequested = f.requesterId === me;

      let lastMessage = null;
      let unreadCount = 0;

      if (f.status === 'ACCEPTED') {
        const last = await prisma.directMessage.findFirst({
          where: {
            OR: [
              { senderId: me, receiverId: other.id },
              { senderId: other.id, receiverId: me },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });
        lastMessage = last
          ? { id: last.id, senderId: last.senderId, content: last.content, createdAt: last.createdAt.toISOString(), read: last.read }
          : null;

        unreadCount = await prisma.directMessage.count({
          where: { senderId: other.id, receiverId: me, read: false },
        });
      }

      return {
        id: f.id,
        userId: other.id,
        handle: other.handle,
        bio: other.bio,
        isVerifiedDev: other.accounts.some((a) => a.provider === 'github'),
        status: f.status,
        iRequested,
        lastMessage,
        unreadCount,
      };
    })
  );

  return NextResponse.json(result);
}

// POST /api/friends — send a friend request
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = session.user.id;

  const { addresseeId } = await req.json();
  if (!addresseeId || addresseeId === me) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Check if friendship already exists in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me, addresseeId },
        { requesterId: addresseeId, addresseeId: me },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') return NextResponse.json({ error: 'Already friends' }, { status: 409 });
    // If they already sent us a request — auto-accept
    if (existing.requesterId === addresseeId) {
      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
      });
      return NextResponse.json({ ok: true, status: 'ACCEPTED', id: updated.id });
    }
    return NextResponse.json({ error: 'Request already sent' }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: me, addresseeId },
  });

  return NextResponse.json({ ok: true, status: 'PENDING', id: friendship.id });
}

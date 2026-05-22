import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/messages/[friendId] — delete entire thread between me and friendId
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ friendId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = session.user.id;
  const { friendId } = await params;

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: me, addresseeId: friendId },
        { requesterId: friendId, addresseeId: me },
      ],
    },
  });
  if (!friendship) return NextResponse.json({ error: 'Not friends' }, { status: 403 });

  await prisma.directMessage.deleteMany({
    where: {
      OR: [
        { senderId: me, receiverId: friendId },
        { senderId: friendId, receiverId: me },
      ],
    },
  });

  return NextResponse.json({ ok: true });
}

// GET /api/messages/[friendId] — fetch conversation history (last 100 messages)
export async function GET(req: NextRequest, { params }: { params: Promise<{ friendId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = session.user.id;
  const { friendId } = await params;

  // Verify friendship
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: me, addresseeId: friendId },
        { requesterId: friendId, addresseeId: me },
      ],
    },
  });
  if (!friendship) return NextResponse.json({ error: 'Not friends' }, { status: 403 });

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: friendId },
        { senderId: friendId, receiverId: me },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  // Mark received messages as read
  await prisma.directMessage.updateMany({
    where: { senderId: friendId, receiverId: me, read: false },
    data: { read: true },
  });

  const friend = await prisma.user.findUnique({
    where: { id: friendId },
    select: { handle: true, bio: true, accounts: { select: { provider: true } } },
  });

  return NextResponse.json({
    friend: {
      id: friendId,
      handle: friend?.handle ?? null,
      bio: friend?.bio ?? null,
      isVerifiedDev: friend?.accounts.some((a) => a.provider === 'github') ?? false,
    },
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      read: m.read,
    })),
  });
}

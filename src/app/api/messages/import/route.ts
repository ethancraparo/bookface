import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/messages/import — bulk-save session chat messages as DMs after becoming friends
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = session.user.id;

  const { friendId, messages } = await req.json() as {
    friendId: string;
    messages: Array<{ fromSelf: boolean; text: string; timestamp: number }>;
  };

  if (!friendId || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  // Verify friendship exists
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

  // Check if we've already imported for this pair to avoid duplicates
  // (use the timestamp of the first message as a rough guard)
  const earliest = new Date(messages[0].timestamp);
  const existing = await prisma.directMessage.findFirst({
    where: {
      OR: [
        { senderId: me, receiverId: friendId },
        { senderId: friendId, receiverId: me },
      ],
      createdAt: { gte: new Date(earliest.getTime() - 5000) },
    },
  });
  if (existing) return NextResponse.json({ ok: true, count: 0, skipped: true });

  const data = messages.map((m) => ({
    senderId:   m.fromSelf ? me : friendId,
    receiverId: m.fromSelf ? friendId : me,
    content:    m.text,
    read:       true,
    createdAt:  new Date(m.timestamp),
  }));

  await prisma.directMessage.createMany({ data });

  return NextResponse.json({ ok: true, count: data.length });
}

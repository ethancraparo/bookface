import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/messages/msg/[messageId] — delete a single message you sent
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = session.user.id;
  const { messageId } = await params;

  const message = await prisma.directMessage.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (message.senderId !== me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.directMessage.delete({ where: { id: messageId } });
  return NextResponse.json({ ok: true });
}

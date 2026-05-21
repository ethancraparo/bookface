import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/friends/[id] — accept a friend request
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship || friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (friendship.status === 'ACCEPTED') {
    return NextResponse.json({ error: 'Already accepted' }, { status: 409 });
  }

  await prisma.friendship.update({ where: { id }, data: { status: 'ACCEPTED' } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/friends/[id] — decline request or unfriend
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const me = session.user.id;

  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship || (friendship.requesterId !== me && friendship.addresseeId !== me)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

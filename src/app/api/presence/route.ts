import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { onlineUsers } from '@/lib/presence';

// GET /api/presence?ids=id1,id2,id3
// Returns the subset of provided user IDs that are currently online.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const raw = req.nextUrl.searchParams.get('ids') ?? '';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);

  const online = ids.filter((id) => onlineUsers.has(id));
  return NextResponse.json(online);
}

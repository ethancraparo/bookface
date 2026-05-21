import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import next from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handler = app.getRequestHandler();

// ── Types ────────────────────────────────────────────────────────────────────

interface QueueEntry {
  socketId: string;
  userId: string;
  tags: string[];
  blockedIds: string[];
}

interface ActiveSession {
  partnerSocketId: string;
  partnerUserId: string;
  revealRequested: boolean; // did THIS socket request a reveal?
}

// ── In-memory state ──────────────────────────────────────────────────────────

const queue: QueueEntry[] = [];
const activeSessions = new Map<string, ActiveSession>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function removeFromQueue(socketId: string) {
  const idx = queue.findIndex((e) => e.socketId === socketId);
  if (idx >= 0) queue.splice(idx, 1);
}

function findMatch(entry: QueueEntry): QueueEntry | null {
  const candidates = queue.filter(
    (q) =>
      q.socketId !== entry.socketId &&
      !entry.blockedIds.includes(q.userId) &&
      !q.blockedIds.includes(entry.userId)
  );
  if (candidates.length === 0) return null;

  // Prefer tag overlap
  if (entry.tags.length > 0) {
    const tagMatch = candidates.find((q) =>
      q.tags.some((t) => entry.tags.includes(t))
    );
    if (tagMatch) return tagMatch;
  }

  // Random fallback
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function getBlockedIds(userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return blocks.map((b) =>
    b.blockerId === userId ? b.blockedId : b.blockerId
  );
}

function endSession(socketId: string) {
  const session = activeSessions.get(socketId);
  if (!session) return null;
  activeSessions.delete(session.partnerSocketId);
  activeSessions.delete(socketId);
  return session;
}

// ── Server bootstrap ─────────────────────────────────────────────────────────

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new SocketServer(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    let currentUserId: string | null = null;

    // ── Queue ──────────────────────────────────────────────────────────────

    socket.on('join_queue', async ({ userId, tags }: { userId: string; tags: string[] }) => {
      currentUserId = userId;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) { socket.emit('error', { message: 'User not found' }); return; }
      if (user.isBanned) { socket.emit('error', { message: 'Account banned' }); return; }
      if (user.bannedUntil && user.bannedUntil > new Date()) {
        socket.emit('error', { message: 'Account temporarily banned' }); return;
      }

      const blockedIds = await getBlockedIds(userId);
      const entry: QueueEntry = { socketId: socket.id, userId, tags: tags ?? [], blockedIds };

      // Don't double-add
      removeFromQueue(socket.id);
      queue.push(entry);

      const match = findMatch(entry);
      if (match) {
        removeFromQueue(socket.id);
        removeFromQueue(match.socketId);

        activeSessions.set(socket.id, {
          partnerSocketId: match.socketId,
          partnerUserId: match.userId,
          revealRequested: false,
        });
        activeSessions.set(match.socketId, {
          partnerSocketId: socket.id,
          partnerUserId: userId,
          revealRequested: false,
        });

        // socket.id is always the initiator
        socket.emit('matched', { isInitiator: true });
        io.to(match.socketId).emit('matched', { isInitiator: false });
      } else {
        socket.emit('waiting');
      }
    });

    socket.on('leave_queue', () => removeFromQueue(socket.id));

    // ── Skip ──────────────────────────────────────────────────────────────

    socket.on('skip', () => {
      const session = endSession(socket.id);
      if (session) {
        io.to(session.partnerSocketId).emit('partner_skipped');
      }
    });

    // ── WebRTC relay ──────────────────────────────────────────────────────

    socket.on('offer', (data: unknown) => {
      const session = activeSessions.get(socket.id);
      if (session) io.to(session.partnerSocketId).emit('offer', data);
    });

    socket.on('answer', (data: unknown) => {
      const session = activeSessions.get(socket.id);
      if (session) io.to(session.partnerSocketId).emit('answer', data);
    });

    socket.on('ice_candidate', (data: unknown) => {
      const session = activeSessions.get(socket.id);
      if (session) io.to(session.partnerSocketId).emit('ice_candidate', data);
    });

    // ── Chat ──────────────────────────────────────────────────────────────

    socket.on('chat_message', ({ message }: { message: string }) => {
      const session = activeSessions.get(socket.id);
      if (!session || !message?.trim()) return;
      io.to(session.partnerSocketId).emit('chat_message', {
        text: message.trim(),
        timestamp: Date.now(),
        fromSelf: false,
      });
    });

    // ── Identity reveal ───────────────────────────────────────────────────

    socket.on('reveal_request', () => {
      const session = activeSessions.get(socket.id);
      if (!session) return;
      session.revealRequested = true;
      io.to(session.partnerSocketId).emit('reveal_request');
    });

    socket.on('reveal_response', async ({ accepted }: { accepted: boolean }) => {
      if (!currentUserId) return;
      const session = activeSessions.get(socket.id);
      if (!session) return;

      if (!accepted) {
        io.to(session.partnerSocketId).emit('reveal_response', { accepted: false });
        return;
      }

      // Both sides' profiles
      const [myProfile, partnerProfile] = await Promise.all([
        prisma.user.findUnique({
          where: { id: currentUserId },
          select: {
            handle: true,
            bio: true,
            githubUrl: true,
            twitterUrl: true,
            contactEmail: true,
            revealHandle: true,
            revealBio: true,
            revealGithub: true,
            revealTwitter: true,
            revealEmail: true,
            accounts: { select: { provider: true } },
          },
        }),
        prisma.user.findUnique({
          where: { id: session.partnerUserId },
          select: {
            handle: true,
            bio: true,
            githubUrl: true,
            twitterUrl: true,
            contactEmail: true,
            revealHandle: true,
            revealBio: true,
            revealGithub: true,
            revealTwitter: true,
            revealEmail: true,
            accounts: { select: { provider: true } },
          },
        }),
      ]);

      if (!myProfile || !partnerProfile) return;

      const fmt = (p: typeof myProfile, uid: string) => ({
        userId:       uid,
        handle:       p.revealHandle  ? p.handle       : null,
        bio:          p.revealBio     ? p.bio          : null,
        githubUrl:    p.revealGithub  ? p.githubUrl    : null,
        twitterUrl:   p.revealTwitter ? p.twitterUrl   : null,
        contactEmail: p.revealEmail   ? p.contactEmail : null,
        isVerifiedDev: p.accounts.some((a) => a.provider === 'github'),
      });

      socket.emit('identity_revealed', fmt(partnerProfile, session.partnerUserId));
      io.to(session.partnerSocketId).emit('identity_revealed', fmt(myProfile, currentUserId));
    });

    // ── Report ────────────────────────────────────────────────────────────

    socket.on('report', async ({ category }: { category: string }) => {
      if (!currentUserId) return;
      const session = activeSessions.get(socket.id);
      if (!session) return;

      const validCategories = ['INAPPROPRIATE_CONTENT', 'HARASSMENT', 'SPAM'];
      if (!validCategories.includes(category)) return;

      await prisma.report.create({
        data: {
          reporterId: currentUserId,
          reportedId: session.partnerUserId,
          category,
        },
      });

      const updated = await prisma.user.update({
        where: { id: session.partnerUserId },
        data: { strikes: { increment: 1 } },
      });

      // Apply bans
      if (updated.strikes >= 10) {
        await prisma.user.update({
          where: { id: session.partnerUserId },
          data: { isBanned: true },
        });
      } else if (updated.strikes >= 5) {
        await prisma.user.update({
          where: { id: session.partnerUserId },
          data: {
            bannedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Auto-block reported user
      await prisma.block.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: currentUserId,
            blockedId: session.partnerUserId,
          },
        },
        create: { blockerId: currentUserId, blockedId: session.partnerUserId },
        update: {},
      });

      // End the session
      const s = endSession(socket.id);
      if (s) io.to(s.partnerSocketId).emit('partner_skipped');

      socket.emit('report_confirmed');
    });

    // ── Disconnect ────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      removeFromQueue(socket.id);
      const session = endSession(socket.id);
      if (session) {
        io.to(session.partnerSocketId).emit('partner_disconnected');
      }
    });
  });

  // ── DM namespace ─────────────────────────────────────────────────────────
  // Persistent socket for direct messages — users register when on /messages

  const dmUserSockets = new Map<string, string>(); // userId → socketId
  const dm = io.of('/dm');

  dm.on('connection', (socket) => {
    let registeredUserId: string | null = null;

    socket.on('register', (userId: string) => {
      registeredUserId = userId;
      dmUserSockets.set(userId, socket.id);
    });

    socket.on('send_message', async ({ toUserId, content }: { toUserId: string; content: string }) => {
      if (!registeredUserId || !content?.trim()) return;

      // Verify friendship
      const friendship = await prisma.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: registeredUserId, addresseeId: toUserId },
            { requesterId: toUserId, addresseeId: registeredUserId },
          ],
        },
      });
      if (!friendship) return;

      const message = await prisma.directMessage.create({
        data: { senderId: registeredUserId, receiverId: toUserId, content: content.trim() },
      });

      const payload = {
        id: message.id,
        senderId: registeredUserId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        read: false,
      };

      // Deliver to recipient if online
      const recipientSocketId = dmUserSockets.get(toUserId);
      if (recipientSocketId) {
        dm.to(recipientSocketId).emit('message', payload);
      }

      // Confirm to sender
      socket.emit('message_sent', payload);
    });

    socket.on('mark_read', async ({ fromUserId }: { fromUserId: string }) => {
      if (!registeredUserId) return;
      await prisma.directMessage.updateMany({
        where: { senderId: fromUserId, receiverId: registeredUserId, read: false },
        data: { read: true },
      });
    });

    socket.on('disconnect', () => {
      if (registeredUserId) dmUserSockets.delete(registeredUserId);
    });
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  httpServer.listen(port, () => {
    console.log(`\n  ▲ bookface ready on http://localhost:${port}\n`);
  });
});

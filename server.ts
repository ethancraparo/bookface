import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import next from 'next';
import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import { onlineUsers } from './src/lib/presence';

const prisma = new PrismaClient();
const dev    = process.env.NODE_ENV !== 'production';
const app    = next({ dev });
const handler = app.getRequestHandler();

// ── Types ────────────────────────────────────────────────────────────────────

interface QueueEntry {
  socketId:   string;
  userId:     string;
  tags:       string[];
  blockedIds: string[];
}

interface GroupMember {
  socketId: string;
  userId:   string;
}

interface Group {
  id:           string;
  members:      GroupMember[];
  expandVotes:  Set<string>; // socketIds that voted yes to expand
}

// ── In-memory state ──────────────────────────────────────────────────────────

const queue:       QueueEntry[]          = [];
const groups       = new Map<string, Group>();   // groupId → Group
const socketGroup  = new Map<string, string>();  // socketId → groupId

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
      !q.blockedIds.includes(entry.userId),
  );
  if (candidates.length === 0) return null;

  if (entry.tags.length > 0) {
    const tagMatch = candidates.find((q) => q.tags.some((t) => entry.tags.includes(t)));
    if (tagMatch) return tagMatch;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function getBlockedIds(userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));
}

/**
 * Remove a socket from its group.
 * Returns remaining members (or null if the group is now empty / didn't exist).
 */
function leaveGroup(socketId: string): { remainingMembers: GroupMember[] } | null {
  const groupId = socketGroup.get(socketId);
  if (!groupId) return null;
  socketGroup.delete(socketId);

  const group = groups.get(groupId);
  if (!group) return null;

  group.members      = group.members.filter((m) => m.socketId !== socketId);
  group.expandVotes.delete(socketId);

  if (group.members.length === 0) { groups.delete(groupId); return null; }
  return { remainingMembers: group.members };
}

/**
 * Check if all group members have voted to expand.
 * If so, pull the next person from the queue and add them.
 */
function checkExpandReady(groupId: string, io: SocketServer) {
  const group = groups.get(groupId);
  if (!group) return;

  const allVoted = group.members.every((m) => group.expandVotes.has(m.socketId));
  if (!allVoted) return;

  group.expandVotes.clear();

  const currentUserIds = new Set(group.members.map((m) => m.userId));
  const candidate = queue.find(
    (q) =>
      !currentUserIds.has(q.userId) &&
      !group.members.some((m) => q.blockedIds.includes(m.userId)),
  );

  if (!candidate) {
    group.members.forEach((m) => io.to(m.socketId).emit('expand_no_match'));
    return;
  }

  removeFromQueue(candidate.socketId);

  const existingSocketIds = group.members.map((m) => m.socketId);
  group.members.push({ socketId: candidate.socketId, userId: candidate.userId });
  socketGroup.set(candidate.socketId, groupId);

  // Notify existing members that someone new is joining
  existingSocketIds.forEach((sid) =>
    io.to(sid).emit('member_joined', { socketId: candidate.socketId }),
  );

  // Tell the new member who's already there — they will initiate all offers
  io.to(candidate.socketId).emit('group_joined', { memberSocketIds: existingSocketIds });
}

// ── Server bootstrap ─────────────────────────────────────────────────────────

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', async (socket) => {
    // Verify the NextAuth session from the cookie
    const authToken = await getToken({
      req:          socket.request as Parameters<typeof getToken>[0]['req'],
      secret:       process.env.NEXTAUTH_SECRET!,
      secureCookie: process.env.NODE_ENV === 'production',
    });
    if (!authToken?.id) { socket.disconnect(true); return; }
    const currentUserId: string = authToken.id as string;

    // ── Queue ──────────────────────────────────────────────────────────────

    socket.on('join_queue', async ({ tags }: { tags: string[] }) => {
      const userId = currentUserId;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user)                                      { socket.emit('error', { message: 'User not found' }); return; }
      if (user.isBanned)                              { socket.emit('error', { message: 'Account banned' }); return; }
      if (user.bannedUntil && user.bannedUntil > new Date()) { socket.emit('error', { message: 'Account temporarily banned' }); return; }

      const blockedIds = await getBlockedIds(userId);
      const entry: QueueEntry = { socketId: socket.id, userId, tags: tags ?? [], blockedIds };

      removeFromQueue(socket.id);
      queue.push(entry);

      const match = findMatch(entry);
      if (match) {
        removeFromQueue(socket.id);
        removeFromQueue(match.socketId);

        const groupId = `${socket.id}:${match.socketId}`;
        const group: Group = {
          id:          groupId,
          members:     [
            { socketId: socket.id,      userId },
            { socketId: match.socketId, userId: match.userId },
          ],
          expandVotes: new Set(),
        };
        groups.set(groupId, group);
        socketGroup.set(socket.id,      groupId);
        socketGroup.set(match.socketId, groupId);

        // Include partnerSocketId so the client knows who to send signaling to
        socket.emit('matched',              { isInitiator: true,  partnerSocketId: match.socketId });
        io.to(match.socketId).emit('matched', { isInitiator: false, partnerSocketId: socket.id });
      } else {
        socket.emit('waiting');
      }
    });

    socket.on('leave_queue', () => removeFromQueue(socket.id));

    // ── Skip ──────────────────────────────────────────────────────────────

    socket.on('skip', () => {
      const result = leaveGroup(socket.id);
      if (!result) return;
      const { remainingMembers } = result;
      if (remainingMembers.length === 1) {
        io.to(remainingMembers[0].socketId).emit('partner_skipped');
      } else {
        remainingMembers.forEach((m) =>
          io.to(m.socketId).emit('member_left', { socketId: socket.id }),
        );
      }
    });

    // ── WebRTC relay — all events are targeted with to/from ───────────────

    socket.on('offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
      if (!socketGroup.has(socket.id)) return;
      io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
      if (!socketGroup.has(socket.id)) return;
      io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice_candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
      if (!socketGroup.has(socket.id)) return;
      io.to(to).emit('ice_candidate', { from: socket.id, candidate });
    });

    // ── Chat ──────────────────────────────────────────────────────────────

    socket.on('chat_message', ({ message }: { message: string }) => {
      if (!message?.trim() || message.length > 1000) return;
      const groupId = socketGroup.get(socket.id);
      if (!groupId) return;
      const group = groups.get(groupId);
      if (!group) return;

      const text      = message.trim();
      const timestamp = Date.now();

      group.members.forEach((m) => {
        if (m.socketId !== socket.id) {
          io.to(m.socketId).emit('chat_message', { text, timestamp, fromSelf: false });
        }
      });
    });

    // ── Expand group ──────────────────────────────────────────────────────

    socket.on('propose_expand', () => {
      const groupId = socketGroup.get(socket.id);
      if (!groupId) return;
      const group = groups.get(groupId);
      if (!group || group.members.length >= 4) return;

      group.expandVotes.add(socket.id);

      // Notify all other members
      group.members.forEach((m) => {
        if (m.socketId !== socket.id) io.to(m.socketId).emit('expand_proposed');
      });

      checkExpandReady(groupId, io);
    });

    socket.on('expand_vote', ({ accept }: { accept: boolean }) => {
      const groupId = socketGroup.get(socket.id);
      if (!groupId) return;
      const group = groups.get(groupId);
      if (!group) return;

      if (!accept) {
        group.expandVotes.clear();
        group.members.forEach((m) => io.to(m.socketId).emit('expand_declined'));
        return;
      }

      group.expandVotes.add(socket.id);
      checkExpandReady(groupId, io);
    });

    // ── Identity reveal (2-person only) ──────────────────────────────────

    socket.on('reveal_request', () => {
      const groupId = socketGroup.get(socket.id);
      if (!groupId) return;
      const group = groups.get(groupId);
      if (!group || group.members.length !== 2) return;
      const partner = group.members.find((m) => m.socketId !== socket.id);
      if (partner) io.to(partner.socketId).emit('reveal_request');
    });

    socket.on('reveal_response', async ({ accepted }: { accepted: boolean }) => {
      const groupId = socketGroup.get(socket.id);
      if (!groupId) return;
      const group = groups.get(groupId);
      if (!group || group.members.length !== 2) return;
      const partner = group.members.find((m) => m.socketId !== socket.id);
      if (!partner) return;

      if (!accepted) {
        io.to(partner.socketId).emit('reveal_response', { accepted: false });
        return;
      }

      const [myProfile, partnerProfile] = await Promise.all([
        prisma.user.findUnique({
          where: { id: currentUserId },
          select: {
            handle: true, bio: true, githubUrl: true, twitterUrl: true, contactEmail: true,
            revealHandle: true, revealBio: true, revealGithub: true, revealTwitter: true, revealEmail: true,
            accounts: { select: { provider: true } },
          },
        }),
        prisma.user.findUnique({
          where: { id: partner.userId },
          select: {
            handle: true, bio: true, githubUrl: true, twitterUrl: true, contactEmail: true,
            revealHandle: true, revealBio: true, revealGithub: true, revealTwitter: true, revealEmail: true,
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

      socket.emit('identity_revealed',              fmt(partnerProfile, partner.userId));
      io.to(partner.socketId).emit('identity_revealed', fmt(myProfile,    currentUserId));
    });

    // ── Report (2-person only) ────────────────────────────────────────────

    socket.on('report', async ({ category }: { category: string }) => {
      const groupId = socketGroup.get(socket.id);
      if (!groupId) return;
      const group = groups.get(groupId);
      if (!group || group.members.length !== 2) return;
      const partner = group.members.find((m) => m.socketId !== socket.id);
      if (!partner) return;

      const validCategories = ['INAPPROPRIATE_CONTENT', 'HARASSMENT', 'SPAM'];
      if (!validCategories.includes(category)) return;

      await prisma.report.create({
        data: { reporterId: currentUserId, reportedId: partner.userId, category },
      });

      const updated = await prisma.user.update({
        where: { id: partner.userId },
        data: { strikes: { increment: 1 } },
      });

      if (updated.strikes >= 10) {
        await prisma.user.update({ where: { id: partner.userId }, data: { isBanned: true } });
      } else if (updated.strikes >= 5) {
        await prisma.user.update({
          where: { id: partner.userId },
          data: { bannedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        });
      }

      await prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: currentUserId, blockedId: partner.userId } },
        create: { blockerId: currentUserId, blockedId: partner.userId },
        update: {},
      });

      const result = leaveGroup(socket.id);
      if (result) result.remainingMembers.forEach((m) => io.to(m.socketId).emit('partner_skipped'));
      socket.emit('report_confirmed');
    });

    // ── Disconnect ────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      removeFromQueue(socket.id);
      const result = leaveGroup(socket.id);
      if (!result) return;
      const { remainingMembers } = result;
      if (remainingMembers.length === 1) {
        io.to(remainingMembers[0].socketId).emit('partner_disconnected');
      } else {
        remainingMembers.forEach((m) =>
          io.to(m.socketId).emit('member_left', { socketId: socket.id }),
        );
      }
    });
  });

  // ── DM namespace ─────────────────────────────────────────────────────────

  const dmUserSockets = new Map<string, string>(); // userId → socketId
  const dm = io.of('/dm');

  dm.on('connection', async (socket) => {
    const authToken = await getToken({
      req:          socket.request as Parameters<typeof getToken>[0]['req'],
      secret:       process.env.NEXTAUTH_SECRET!,
      secureCookie: process.env.NODE_ENV === 'production',
    });
    if (!authToken?.id) { socket.disconnect(true); return; }
    const registeredUserId: string = authToken.id as string;

    dmUserSockets.set(registeredUserId, socket.id);
    onlineUsers.add(registeredUserId);

    socket.on('register', () => {
      // userId now verified from auth token — client-provided value ignored
    });

    socket.on('send_message', async ({ toUserId, content }: { toUserId: string; content: string }) => {
      if (!content?.trim() || content.length > 2000) return;

      const friendship = await prisma.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: registeredUserId, addresseeId: toUserId },
            { requesterId: toUserId,         addresseeId: registeredUserId },
          ],
        },
      });
      if (!friendship) return;

      const message = await prisma.directMessage.create({
        data: { senderId: registeredUserId, receiverId: toUserId, content: content.trim() },
      });

      const payload = {
        id:        message.id,
        senderId:  registeredUserId,
        content:   message.content,
        createdAt: message.createdAt.toISOString(),
        read:      false,
      };

      const recipientSocketId = dmUserSockets.get(toUserId);
      if (recipientSocketId) dm.to(recipientSocketId).emit('message', payload);
      socket.emit('message_sent', payload);
    });

    socket.on('mark_read', async ({ fromUserId }: { fromUserId: string }) => {
      await prisma.directMessage.updateMany({
        where: { senderId: fromUserId, receiverId: registeredUserId, read: false },
        data: { read: true },
      });
    });

    socket.on('disconnect', () => {
      dmUserSockets.delete(registeredUserId);
      onlineUsers.delete(registeredUserId);
    });
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  httpServer.listen(port, () => {
    console.log(`\n  ▲ bookface ready on http://localhost:${port}\n`);
  });
});

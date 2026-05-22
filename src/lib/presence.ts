/**
 * Shared in-memory presence store.
 * Both server.ts (Socket.io DM namespace) and API routes import this module,
 * so they share the same Set within the same Node process.
 */
export const onlineUsers = new Set<string>();

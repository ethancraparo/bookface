/**
 * Simple in-memory sliding-window rate limiter.
 * Good enough for a single-process server (Railway single dyno).
 * Swap for a Redis-backed solution if you ever run multiple instances.
 */

const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request is allowed, false if it should be rejected.
 * @param key     Unique key (e.g. "signup:1.2.3.4")
 * @param limit   Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

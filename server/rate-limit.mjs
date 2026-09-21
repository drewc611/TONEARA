/**
 * Fixed-window rate limiter. Keys are opaque strings chosen by the caller; this
 * module never sees a prompt, an address, or any other request content.
 */
export function createRateLimiter({ limit = 12, windowMs = 60_000, now = Date.now } = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer.');
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new RangeError('windowMs must be positive.');
  const windows = new Map();

  function prune(currentWindow) {
    for (const [key, entry] of windows) if (entry.window !== currentWindow) windows.delete(key);
  }

  function take(key) {
    const timestamp = now();
    const currentWindow = Math.floor(timestamp / windowMs);
    if (windows.size > 10_000) prune(currentWindow);

    const entry = windows.get(key);
    const count = entry && entry.window === currentWindow ? entry.count : 0;
    const resetAt = (currentWindow + 1) * windowMs;

    if (count >= limit) {
      return { allowed: false, remaining: 0, resetAt, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - timestamp) / 1000)) };
    }
    windows.set(key, { window: currentWindow, count: count + 1 });
    return { allowed: true, remaining: limit - count - 1, resetAt, retryAfterSeconds: 0 };
  }

  return { take, limit, windowMs, get size() { return windows.size; } };
}

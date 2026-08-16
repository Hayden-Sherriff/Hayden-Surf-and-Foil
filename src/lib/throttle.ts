const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type Bucket = { count: number; resetAt: number };

/**
 * Per-instance login throttle. Enough for the single-user deployment this app
 * targets; a shared store would be needed across multiple instances.
 */
const buckets = new Map<string, Bucket>();

export function isThrottled(key: string, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  return bucket !== undefined && bucket.resetAt > now && bucket.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string, now = Date.now()): void {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}

export function resetThrottle(): void {
  buckets.clear();
}

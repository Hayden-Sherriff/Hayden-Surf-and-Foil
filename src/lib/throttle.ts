const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type Bucket = { count: number; resetAt: number };

/**
 * Per-instance login throttle. Enough for the single-user deployment this app
 * targets; a shared store would be needed across multiple instances.
 */
const buckets = new Map<string, Bucket>();

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function isThrottled(key: string, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  return bucket !== undefined && bucket.resetAt > now && bucket.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string, now = Date.now()): void {
  sweep(now);
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

export function trackedClients(): number {
  return buckets.size;
}

/**
 * Vercel overwrites `x-vercel-forwarded-for` and `x-real-ip` with the real peer
 * address, so they cannot be spoofed there. `x-forwarded-for` is client-supplied
 * and only used as a last resort, where the shared fallback bucket applies.
 */
export function clientKey(request: Request): string {
  const trusted =
    request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip");
  if (trusted) return trusted.split(",")[0].trim();
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown-peer";
}

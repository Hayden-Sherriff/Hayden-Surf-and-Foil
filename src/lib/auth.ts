export const SESSION_COOKIE = "hsf_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64url(new Uint8Array(signature));
}

/** Avoids `Buffer` so the module stays Web-API only for the edge middleware. */
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = String(Date.now() + SESSION_TTL_MS);
  return `${expiresAt}.${await sign(expiresAt)}`;
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  return constantTimeEqual(signature, await sign(expiresAt));
}

export async function isValidPassword(password: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD is not set");
  return constantTimeEqual(password, expected);
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/**
 * Shared by login and logout: the delete has to repeat the same `path`, or the
 * browser expires a different cookie scoped to `/api` and the session survives.
 */
export const SESSION_COOKIE_OPTIONS = {
  name: SESSION_COOKIE,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/**
 * The session cookie is sameSite "lax", which still allows top-level form posts
 * from other sites, so the auth routes require a matching `Origin`. Browsers
 * always send it on form posts, so a missing header is rejected too.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Compares SHA-256 digests rather than the raw strings so the comparison is
 * always over the same number of bytes and cannot leak the expected length.
 */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([digest(a), digest(b)]);
  let mismatch = 0;
  for (let i = 0; i < digestA.length; i += 1) {
    mismatch |= digestA[i] ^ digestB[i];
  }
  return mismatch === 0;
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

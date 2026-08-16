import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  isSameOrigin,
  isValidPassword,
  isValidSessionToken,
  safeRedirectPath,
  sessionCookieOptions,
} from "./auth";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret";
  process.env.APP_PASSWORD = "correct-horse";
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("session tokens", () => {
  it("accepts a freshly signed token", async () => {
    expect(await isValidSessionToken(await createSessionToken())).toBe(true);
  });

  it("rejects a tampered signature", async () => {
    const [expiresAt] = (await createSessionToken()).split(".");
    expect(await isValidSessionToken(`${expiresAt}.not-the-signature`)).toBe(false);
  });

  it("rejects a valid token with an extra trailing segment", async () => {
    expect(await isValidSessionToken(`${await createSessionToken()}.extra`)).toBe(false);
  });

  it("rejects a non-numeric expiry", async () => {
    expect(await isValidSessionToken("later.whatever")).toBe(false);
  });

  it("rejects an expired token", async () => {
    expect(await isValidSessionToken(`${Date.now() - 1000}.whatever`)).toBe(false);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken();
    process.env.SESSION_SECRET = "different-secret";
    expect(await isValidSessionToken(token)).toBe(false);
  });

  it("rejects sessions issued before a password rotation", async () => {
    const token = await createSessionToken();
    process.env.APP_PASSWORD = "rotated-password";
    expect(await isValidSessionToken(token)).toBe(false);
  });
});

describe("password check", () => {
  it("accepts the configured password", async () => {
    expect(await isValidPassword("correct-horse")).toBe(true);
  });

  it("rejects a wrong password of a different length", async () => {
    expect(await isValidPassword("c")).toBe(false);
  });
});

describe("origin check", () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request("https://surf.example.com/api/login", { method: "POST", headers });

  it("allows a same-origin post", () => {
    expect(
      isSameOrigin(
        withHeaders({ origin: "https://surf.example.com", host: "surf.example.com" }),
      ),
    ).toBe(true);
  });

  it("rejects a cross-site post", () => {
    expect(
      isSameOrigin(withHeaders({ origin: "https://evil.example", host: "surf.example.com" })),
    ).toBe(false);
  });

  it("rejects requests without an origin header", () => {
    expect(isSameOrigin(withHeaders({ host: "surf.example.com" }))).toBe(false);
  });
});

describe("session cookie options", () => {
  const post = (url: string, headers: Record<string, string> = {}) =>
    new Request(url, { method: "POST", headers });

  it("marks the cookie secure over https", () => {
    expect(sessionCookieOptions(post("https://surf.example.com/api/login")).secure).toBe(true);
  });

  it("marks the cookie secure behind an https proxy", () => {
    expect(
      sessionCookieOptions(
        post("http://surf.example.com/api/login", { "x-forwarded-proto": "https" }),
      ).secure,
    ).toBe(true);
  });

  it("keeps a remote plain-http host secure so the cookie is never sent in clear", () => {
    expect(sessionCookieOptions(post("http://surf.example.com/api/login")).secure).toBe(true);
  });

  it("drops secure for a local plain-http run so the browser keeps the cookie", () => {
    expect(sessionCookieOptions(post("http://localhost:3000/api/login")).secure).toBe(false);
    expect(sessionCookieOptions(post("http://127.0.0.1:3000/api/login")).secure).toBe(false);
  });

  it("keeps localhost secure when the proxy terminated https", () => {
    expect(
      sessionCookieOptions(post("http://localhost:3000/api/login", { "x-forwarded-proto": "https" }))
        .secure,
    ).toBe(true);
  });
});

describe("post-login redirect target", () => {
  it("keeps a same-site path with its query", () => {
    expect(safeRedirectPath("/spots?spot=kirra")).toBe("/spots?spot=kirra");
  });

  it("falls back to the week view for off-site or missing targets", () => {
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("https://evil.example/steal")).toBe("/");
    expect(safeRedirectPath("//evil.example/steal")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    // The URL parser strips tab/CR/LF, so these resolve off-site if passed through.
    expect(safeRedirectPath("/\t/evil.example")).toBe("/");
    expect(safeRedirectPath("/\n/evil.example")).toBe("/");
    expect(safeRedirectPath("/\r/evil.example")).toBe("/");
    expect(safeRedirectPath("/\t\\evil.example")).toBe("/");
    expect(safeRedirectPath("spots")).toBe("/");
  });

  it("does not bounce back to the login screen", () => {
    expect(safeRedirectPath("/login")).toBe("/");
    expect(safeRedirectPath("/login?error=1")).toBe("/");
    expect(safeRedirectPath("/login/anything")).toBe("/");
  });

  it("keeps a path that merely starts with the same letters", () => {
    expect(safeRedirectPath("/logins")).toBe("/logins");
  });
});

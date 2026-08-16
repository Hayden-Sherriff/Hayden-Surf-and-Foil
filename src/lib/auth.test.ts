import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, isSameOrigin, isValidPassword, isValidSessionToken } from "./auth";

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

  it("allows requests without an origin header", () => {
    expect(isSameOrigin(withHeaders({ host: "surf.example.com" }))).toBe(true);
  });
});

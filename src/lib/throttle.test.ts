import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAttempts,
  clientKey,
  isThrottled,
  recordFailure,
  resetThrottle,
  trackedClients,
} from "./throttle";

beforeEach(resetThrottle);

describe("login throttle", () => {
  it("allows the first nine failures then blocks", () => {
    for (let i = 0; i < 9; i += 1) recordFailure("1.2.3.4");
    expect(isThrottled("1.2.3.4")).toBe(false);
    recordFailure("1.2.3.4");
    expect(isThrottled("1.2.3.4")).toBe(true);
  });

  it("tracks clients independently", () => {
    for (let i = 0; i < 10; i += 1) recordFailure("1.2.3.4");
    expect(isThrottled("5.6.7.8")).toBe(false);
  });

  it("expires the window", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i += 1) recordFailure("1.2.3.4", now);
    expect(isThrottled("1.2.3.4", now + 16 * 60 * 1000)).toBe(false);
  });

  it("clears attempts after a successful login", () => {
    for (let i = 0; i < 10; i += 1) recordFailure("1.2.3.4");
    clearAttempts("1.2.3.4");
    expect(isThrottled("1.2.3.4")).toBe(false);
  });

  it("drops expired buckets instead of growing forever", () => {
    const now = Date.now();
    for (let i = 0; i < 50; i += 1) recordFailure(`10.0.0.${i}`, now);
    expect(trackedClients()).toBe(50);
    recordFailure("10.1.0.1", now + 16 * 60 * 1000);
    expect(trackedClients()).toBe(1);
  });
});

describe("clientKey", () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request("https://surf.example.com/api/login", { method: "POST", headers });

  it("prefers the platform-set header over the client-supplied one", () => {
    expect(
      clientKey(
        withHeaders({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }),
      ),
    ).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then x-forwarded-for", () => {
    expect(clientKey(withHeaders({ "x-real-ip": "203.0.113.10" }))).toBe("203.0.113.10");
    expect(clientKey(withHeaders({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
  });
});

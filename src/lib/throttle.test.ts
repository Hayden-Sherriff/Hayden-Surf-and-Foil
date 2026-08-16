import { beforeEach, describe, expect, it } from "vitest";
import { clearAttempts, isThrottled, recordFailure, resetThrottle } from "./throttle";

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
});

import { describe, expect, it } from "vitest";
import { brisbaneNow, formatHour, formatWindow } from "./format";

describe("formatHour", () => {
  it("labels midnight and noon", () => {
    expect(formatHour("2026-08-16T00:00")).toBe("12am");
    expect(formatHour("2026-08-16T12:00")).toBe("12pm");
  });

  it("labels morning and afternoon hours", () => {
    expect(formatHour("2026-08-16T06:00")).toBe("6am");
    expect(formatHour("2026-08-16T18:00")).toBe("6pm");
  });
});

describe("formatWindow", () => {
  it("reads through to the end of the last hour", () => {
    expect(formatWindow("2026-08-16T05:00", "2026-08-16T10:00")).toBe("5am-11am");
  });

  it("wraps a window that runs to the end of the day", () => {
    expect(formatWindow("2026-08-16T20:00", "2026-08-16T23:00")).toBe("8pm-12am");
  });
});

describe("brisbaneNow", () => {
  it("renders UTC instants as Brisbane wall clock (UTC+10)", () => {
    expect(brisbaneNow(new Date("2026-08-15T20:30:00Z"))).toBe("2026-08-16T06:30");
  });
});

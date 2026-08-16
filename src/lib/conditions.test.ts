import { describe, expect, it } from "vitest";
import {
  angleDelta,
  buildWindows,
  compassPoint,
  inWindow,
  rateFoilHour,
  rateSurfHour,
  surfSizeFt,
} from "./conditions";
import { FOIL_SPOTS, SURF_SPOTS } from "./spots";

const burleigh = SURF_SPOTS.find((spot) => spot.id === "burleigh")!;
const dbah = SURF_SPOTS.find((spot) => spot.id === "duranbah")!;
const creek = FOIL_SPOTS.find((spot) => spot.id === "currumbin-creek")!;

const swell = { swellHeightM: 1.3, swellPeriodS: 10, swellDir: 135 };

function surf(overrides: Partial<Parameters<typeof rateSurfHour>[1]> = {}, spot = burleigh) {
  return rateSurfHour(spot, {
    time: "2026-08-16T07:00",
    waveHeightM: 1.05,
    windKts: 8,
    windGustKts: 12,
    windDir: 225,
    ...swell,
    ...overrides,
  });
}

describe("compass helpers", () => {
  it("names directions", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(225)).toBe("SW");
    expect(compassPoint(359)).toBe("N");
  });

  it("measures the short way around the compass", () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(20);
  });

  it("handles windows that wrap through north", () => {
    expect(inWindow(350, [300, 30])).toBe(true);
    expect(inWindow(100, [300, 30])).toBe(false);
  });
});

describe("surf rating", () => {
  it("calls 3ft+ with offshore wind good", () => {
    const hour = surf();
    expect(hour.rating).toBe("good");
    expect(hour.windQuality).toBe("offshore");
  });

  it("calls a lined-up 4ft+ offshore morning epic", () => {
    expect(surf({ waveHeightM: 1.5 }).rating).toBe("epic");
  });

  it("rejects onshore wind no matter the size", () => {
    expect(surf({ windDir: 45, windKts: 15 }).rating).toBe("poor");
  });

  it("rates a storm-force onshore hour no better than a light onshore one", () => {
    expect(surf({ windDir: 45, windKts: 30 }).rating).toBe("poor");
    expect(surf({ windKts: 30 }).rating).toBe("fair");
  });

  it("treats sub-6kt wind as glassy regardless of direction", () => {
    const hour = surf({ windDir: 45, windKts: 3 });
    expect(hour.windQuality).toBe("glassy");
    expect(hour.rating).toBe("good");
  });

  it("drops small surf even when it is clean", () => {
    expect(surf({ waveHeightM: 0.5 }).rating).toBe("poor");
  });

  it("downgrades swell outside the spot window", () => {
    expect(surf({ swellDir: 300 }).rating).not.toBe("good");
  });

  it("names the gale as well as the swell angle when both are wrong", () => {
    const hour = surf({ swellDir: 300, windKts: 30, windDir: 225 });
    expect(hour.reason).toContain("outside");
    expect(hour.reason).toContain("30kt");
    // Two problems at once is worse than either alone, which would rate fair.
    expect(hour.rating).toBe("poor");
  });

  it("runs the points smaller than the beach breaks on the same swell", () => {
    expect(surfSizeFt(dbah, 1.4, 135, 10)).toBeGreaterThan(surfSizeFt(burleigh, 1.4, 135, 10));
  });

  it("penalises off-angle swell more at the points", () => {
    const straight = surfSizeFt(burleigh, 1.4, 135, 10);
    const offAngle = surfSizeFt(burleigh, 1.4, 45, 10);
    expect(offAngle).toBeLessThan(straight);
  });
});

describe("wing foil rating", () => {
  const foil = (windKts: number, windDir: number) =>
    rateFoilHour(creek, { time: "2026-08-16T13:00", windKts, windGustKts: windKts + 4, windDir });

  it("needs 16kt", () => {
    expect(foil(12, 45).rating).toBe("poor");
    expect(foil(14, 45).rating).toBe("fair");
    expect(foil(17, 45).rating).toBe("good");
  });

  it("calls a strong NE epic", () => {
    expect(foil(22, 45).rating).toBe("epic");
  });

  it("keeps strong off-angle wind as merely good", () => {
    expect(foil(22, 180).rating).toBe("good");
  });

  it("rejects westerlies", () => {
    expect(foil(22, 270).rating).toBe("poor");
  });
});

describe("windows", () => {
  it("groups consecutive good hours and breaks on gaps", () => {
    const hours = [
      { time: "2026-08-16T06:00", rating: "good" as const, spotName: "Burleigh Heads" },
      { time: "2026-08-16T07:00", rating: "epic" as const, spotName: "Kirra" },
      { time: "2026-08-16T08:00", rating: "poor" as const, spotName: "Burleigh Heads" },
      { time: "2026-08-16T09:00", rating: "good" as const, spotName: "Snapper" },
    ];

    const windows = buildWindows(hours, (best) => best.spotName);
    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({
      startTime: "2026-08-16T06:00",
      endTime: "2026-08-16T07:00",
      rating: "epic",
      spotName: "Kirra",
    });
    expect(windows[1].startTime).toBe("2026-08-16T09:00");
  });
});

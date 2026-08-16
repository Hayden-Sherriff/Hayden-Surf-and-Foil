import type { FoilSpot, SurfSpot } from "./spots";

export const THRESHOLDS = {
  /** Hayden's bar for good surf, in feet of face height. */
  goodSurfFt: 3,
  epicSurfFt: 4,
  /** Anything under this is glassy enough that direction stops mattering. */
  lightWindKts: 6,
  /** Offshore that is strong enough to wreck the wave face. */
  blownOffshoreKts: 25,
  /** Hayden's bar for wing foiling. */
  goodWindKts: 16,
  epicWindKts: 20,
  /** Above this it is survival, not fun. */
  maxWindKts: 32,
  /** Hours of the day that are worth surfing/foiling. */
  dayStartHour: 5,
  dayEndHour: 18,
} as const;

export type Rating = "epic" | "good" | "fair" | "poor";

export const RATING_ORDER: Record<Rating, number> = {
  poor: 0,
  fair: 1,
  good: 2,
  epic: 3,
};

export type WindQuality = "offshore" | "cross-offshore" | "cross-shore" | "onshore" | "glassy";

export type SurfHour = {
  time: string;
  spotId: string;
  spotName: string;
  surfFt: number;
  swellFt: number;
  swellPeriodS: number;
  swellDir: number;
  windKts: number;
  windGustKts: number;
  windDir: number;
  windQuality: WindQuality;
  rating: Rating;
  reason: string;
};

export type FoilHour = {
  time: string;
  spotId: string;
  spotName: string;
  windKts: number;
  windGustKts: number;
  windDir: number;
  rating: Rating;
  reason: string;
};

export function compassPoint(deg: number): string {
  const points = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return points[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

/** Smallest absolute angle between two compass bearings. */
export function angleDelta(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360 + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

export function inWindow(deg: number, [from, to]: [number, number]): boolean {
  const d = ((deg % 360) + 360) % 360;
  return from <= to ? d >= from && d <= to : d >= from || d <= to;
}

export function metresToFeet(m: number): number {
  return m * 3.28084;
}

export function windQualityFor(spot: SurfSpot, windDir: number, windKts: number): WindQuality {
  if (windKts < THRESHOLDS.lightWindKts) return "glassy";
  const delta = angleDelta(windDir, spot.offshoreDir);
  if (delta <= 45) return "offshore";
  if (delta <= 75) return "cross-offshore";
  if (delta <= 110) return "cross-shore";
  return "onshore";
}

/**
 * Open-Meteo reports open-ocean significant wave height, which is the same for
 * every spot along this short stretch of coast. Scaling it by the spot's
 * exposure and how far the swell is off its ideal angle (long-period swell
 * wraps in better) approximates the local surf height instead.
 */
export function surfSizeFt(
  spot: SurfSpot,
  waveHeightM: number,
  swellDir: number,
  swellPeriodS: number,
): number {
  const offAngle = Math.min(angleDelta(swellDir, spot.idealSwellDir), 90) / 90;
  const wrap = clamp((swellPeriodS - 8) / 8, 0, 1);
  const penalty = spot.refraction * offAngle * (1 - 0.4 * wrap);
  return metresToFeet(waveHeightM) * spot.exposure * (1 - penalty);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function rateSurfHour(
  spot: SurfSpot,
  input: {
    time: string;
    waveHeightM: number;
    swellHeightM: number;
    swellPeriodS: number;
    swellDir: number;
    windKts: number;
    windGustKts: number;
    windDir: number;
  },
): SurfHour {
  const surfFt = round1(surfSizeFt(spot, input.waveHeightM, input.swellDir, input.swellPeriodS));
  const swellFt = round1(metresToFeet(input.swellHeightM));
  const windQuality = windQualityFor(spot, input.windDir, input.windKts);
  const clean = windQuality === "offshore" || windQuality === "glassy";
  const halfClean = windQuality === "cross-offshore";
  const inSwellWindow = inWindow(input.swellDir, spot.swellWindow);
  const bigEnough = surfFt >= THRESHOLDS.goodSurfFt;
  const overpowering = input.windKts >= THRESHOLDS.blownOffshoreKts;

  let rating: Rating = "poor";
  let reason: string;

  if (!inSwellWindow) {
    reason = `${compassPoint(input.swellDir)} swell is outside the ${spot.shortName} window`;
    rating = surfFt >= THRESHOLDS.goodSurfFt && clean ? "fair" : "poor";
  } else if (overpowering) {
    rating = bigEnough && (clean || halfClean) ? "fair" : "poor";
    reason = `${Math.round(input.windKts)}kt ${compassPoint(input.windDir)} is too strong, faces will be chopped up`;
  } else if (bigEnough && clean) {
    const lined = angleDelta(input.swellDir, spot.idealSwellDir) <= 35 && input.swellPeriodS >= 8;
    rating = surfFt >= THRESHOLDS.epicSurfFt && lined ? "epic" : "good";
    reason = `${surfFt}ft with ${windQuality === "glassy" ? "glassy" : `${Math.round(input.windKts)}kt offshore`} winds`;
  } else if (bigEnough && halfClean) {
    rating = "fair";
    reason = `${surfFt}ft but ${Math.round(input.windKts)}kt ${compassPoint(input.windDir)} is cross-offshore`;
  } else if (bigEnough) {
    rating = "poor";
    reason = `${surfFt}ft but ${Math.round(input.windKts)}kt ${compassPoint(input.windDir)} onshore`;
  } else if (clean && surfFt >= THRESHOLDS.goodSurfFt - 0.6) {
    rating = "fair";
    reason = `Clean but only ${surfFt}ft`;
  } else {
    reason = `Only ${surfFt}ft`;
  }

  return {
    time: input.time,
    spotId: spot.id,
    spotName: spot.name,
    surfFt,
    swellFt,
    swellPeriodS: round1(input.swellPeriodS),
    swellDir: Math.round(input.swellDir),
    windKts: Math.round(input.windKts),
    windGustKts: Math.round(input.windGustKts),
    windDir: Math.round(input.windDir),
    windQuality,
    rating,
    reason,
  };
}

export function rateFoilHour(
  spot: FoilSpot,
  input: { time: string; windKts: number; windGustKts: number; windDir: number },
): FoilHour {
  const workable = inWindow(input.windDir, spot.windWindow);
  const ideal = inWindow(input.windDir, spot.idealWindWindow);
  const dir = compassPoint(input.windDir);
  const kts = Math.round(input.windKts);

  let rating: Rating = "poor";
  let reason: string;

  if (!workable) {
    rating = "poor";
    reason = `${dir} wind does not work at Currumbin`;
  } else if (input.windKts >= THRESHOLDS.maxWindKts) {
    rating = "fair";
    reason = `${kts}kt ${dir} is nuking, small wing only`;
  } else if (input.windKts >= THRESHOLDS.goodWindKts) {
    rating = input.windKts >= THRESHOLDS.epicWindKts && ideal ? "epic" : "good";
    reason = `${kts}kt ${dir}${ideal ? "" : " (off-angle but sailable)"}`;
  } else if (input.windKts >= THRESHOLDS.goodWindKts - 3) {
    rating = "fair";
    reason = `${kts}kt ${dir}, marginal on a big wing`;
  } else {
    reason = `Only ${kts}kt ${dir}`;
  }

  return {
    time: input.time,
    spotId: spot.id,
    spotName: spot.name,
    windKts: kts,
    windGustKts: Math.round(input.windGustKts),
    windDir: Math.round(input.windDir),
    rating,
    reason,
  };
}

export type Window = {
  startTime: string;
  endTime: string;
  rating: Rating;
  spotName: string;
  headline: string;
};

/**
 * Collapses consecutive good-or-better hours into windows, keeping the best
 * spot/hour as the headline for each.
 */
export function buildWindows<T extends { time: string; rating: Rating; spotName: string }>(
  hours: T[],
  headlineFor: (best: T) => string,
  minRating: Rating = "good",
): Window[] {
  const windows: Window[] = [];
  let current: T[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const best = current.reduce((a, b) => (RATING_ORDER[b.rating] > RATING_ORDER[a.rating] ? b : a));
    windows.push({
      startTime: current[0].time,
      endTime: current[current.length - 1].time,
      rating: best.rating,
      spotName: best.spotName,
      headline: headlineFor(best),
    });
    current = [];
  };

  for (const hour of hours) {
    if (RATING_ORDER[hour.rating] >= RATING_ORDER[minRating]) {
      const prev = current[current.length - 1];
      if (prev && hourGap(prev.time, hour.time) > 1) flush();
      current.push(hour);
    } else {
      flush();
    }
  }
  flush();
  return windows;
}

/**
 * Times are naive local strings (`2026-08-16T05:00`). Parsing them as UTC makes
 * the wall-clock gap independent of the server timezone.
 */
function hourGap(a: string, b: string): number {
  return Math.abs(Date.parse(`${b}Z`) - Date.parse(`${a}Z`)) / 3_600_000;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

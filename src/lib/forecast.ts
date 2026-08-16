import {
  RATING_ORDER,
  buildWindows,
  compassPoint,
  rateFoilHour,
  rateSurfHour,
  THRESHOLDS,
  type FoilHour,
  type Rating,
  type SurfHour,
  type Window,
} from "./conditions";
import { FOIL_SPOTS, SURF_SPOTS } from "./spots";
import { brisbaneNow } from "./format";

export const TIMEZONE = "Australia/Brisbane";
const FORECAST_DAYS = 7;

type MarineResponse = {
  hourly: {
    time: string[];
    wave_period: (number | null)[];
    swell_wave_height: (number | null)[];
    swell_wave_direction: (number | null)[];
    swell_wave_period: (number | null)[];
  };
};

type WindResponse = {
  hourly: {
    time: string[];
    wind_speed_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
  };
};

async function fetchJson<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`Forecast request failed (${res.status}) for ${new URL(url).pathname}`);
  }
  const body = (await res.json()) as T | T[];
  return Array.isArray(body) ? body : [body];
}

function coords(spots: { lat: number; lon: number }[]) {
  return {
    latitude: spots.map((s) => s.lat).join(","),
    longitude: spots.map((s) => s.lon).join(","),
  };
}

function marineUrl(spots: { lat: number; lon: number }[]): string {
  const { latitude, longitude } = coords(spots);
  return (
    `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=wave_period,swell_wave_height,swell_wave_direction,swell_wave_period` +
    `&timezone=${encodeURIComponent(TIMEZONE)}&forecast_days=${FORECAST_DAYS}`
  );
}

function windUrl(spots: { lat: number; lon: number }[]): string {
  const { latitude, longitude } = coords(spots);
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn` +
    `&timezone=${encodeURIComponent(TIMEZONE)}&forecast_days=${FORECAST_DAYS}`
  );
}

/**
 * The marine model rejects coordinates it considers land, and one bad point
 * fails the whole batch, so a failed batch falls back to per-spot requests and
 * keeps whatever resolves. A single spot failing costs that spot; every spot
 * failing means the source is down, which throws rather than rendering an empty
 * week as "nothing good is coming".
 */
async function fetchPerSpot<T, S extends { lat: number; lon: number }>(
  spots: S[],
  url: (spots: S[]) => string,
): Promise<(T | null)[]> {
  let batchError: unknown;
  try {
    const batch = await fetchJson<T>(url(spots));
    // The batch is joined back to spots by position, so a short response would
    // silently misattribute one spot's forecast to another.
    if (batch.length === spots.length) return batch;
    throw new Error(`Forecast returned ${batch.length} of ${spots.length} spots`);
  } catch (error) {
    batchError = error;
  }

  const results = await Promise.all(
    spots.map(async (spot) => {
      try {
        return (await fetchJson<T>(url([spot])))[0] ?? null;
      } catch {
        return null;
      }
    }),
  );
  if (results.every((result) => result === null)) throw batchError;
  return results;
}

/** Explicit join on the hour so the two APIs' time axes can't silently drift. */
function byTime<T extends { time: string[] }>(hourly: T): Map<string, number> {
  return new Map(hourly.time.map((time, index) => [time, index]));
}

function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

function isDaylight(time: string): boolean {
  const hour = hourOf(time);
  return hour >= THRESHOLDS.dayStartHour && hour <= THRESHOLDS.dayEndHour;
}

/** Hours that have already passed in Brisbane are no use for "be ready". */
function isUpcoming(time: string, now: string): boolean {
  return time.slice(0, 13) >= now.slice(0, 13);
}

export type DayForecast = {
  date: string;
  weekday: string;
  surf: {
    best: Rating;
    windows: Window[];
    hours: SurfHour[];
  };
  foil: {
    best: Rating;
    windows: Window[];
    hours: FoilHour[];
  };
};

export type WeekForecast = {
  generatedAt: string;
  /** Brisbane date at render time, so client components don't recompute it. */
  today: string;
  days: DayForecast[];
};

export async function getWeekForecast(): Promise<WeekForecast> {
  const now = brisbaneNow();
  const [marine, surfWind, foilWind] = await Promise.all([
    fetchPerSpot<MarineResponse, (typeof SURF_SPOTS)[number]>(SURF_SPOTS, marineUrl),
    fetchPerSpot<WindResponse, (typeof SURF_SPOTS)[number]>(SURF_SPOTS, windUrl),
    fetchPerSpot<WindResponse, (typeof FOIL_SPOTS)[number]>(FOIL_SPOTS, windUrl),
  ]);

  const surfHours: SurfHour[] = [];
  SURF_SPOTS.forEach((spot, index) => {
    const sea = marine[index]?.hourly;
    const wind = surfWind[index]?.hourly;
    if (!sea || !wind) return;
    const windIndex = byTime(wind);
    sea.time.forEach((time, i) => {
      if (!isDaylight(time) || !isUpcoming(time, now)) return;
      const w = windIndex.get(time);
      if (w === undefined) return;
      const swellHeightM = sea.swell_wave_height[i];
      const windKts = wind.wind_speed_10m[w];
      const windDir = wind.wind_direction_10m[w];
      const swellDir = sea.swell_wave_direction[i];
      const periodS = sea.swell_wave_period[i] ?? sea.wave_period[i];
      if (
        swellHeightM == null ||
        windKts == null ||
        windDir == null ||
        swellDir == null ||
        periodS == null
      ) {
        return;
      }
      surfHours.push(
        rateSurfHour(spot, {
          time,
          swellHeightM,
          swellPeriodS: periodS,
          swellDir,
          windKts,
          windGustKts: wind.wind_gusts_10m[w] ?? windKts,
          windDir,
        }),
      );
    });
  });

  const foilHours: FoilHour[] = [];
  FOIL_SPOTS.forEach((spot, index) => {
    const wind = foilWind[index]?.hourly;
    if (!wind) return;
    wind.time.forEach((time, i) => {
      if (!isDaylight(time) || !isUpcoming(time, now)) return;
      const windKts = wind.wind_speed_10m[i];
      const windDir = wind.wind_direction_10m[i];
      if (windKts == null || windDir == null) return;
      foilHours.push(
        rateFoilHour(spot, {
          time,
          windKts,
          windGustKts: wind.wind_gusts_10m[i] ?? windKts,
          windDir,
        }),
      );
    });
  });

  // Taken from the models' own time axis, not from the rated hours, so a day with
  // nothing rideable still gets a card instead of vanishing from the week. Days
  // with no daylight left are dropped, so an evening visit doesn't read today as
  // flat when it is simply over.
  const dates = [
    ...new Set(
      [...marine, ...surfWind, ...foilWind]
        .flatMap((source) => source?.hourly.time ?? [])
        .filter((time) => isDaylight(time) && isUpcoming(time, now))
        .map((time) => time.slice(0, 10)),
    ),
  ].sort();

  const days = dates.map((date) => {
    const surfForDay = bestPerHour(surfHours.filter((h) => h.time.startsWith(date)));
    const foilForDay = bestPerHour(foilHours.filter((h) => h.time.startsWith(date)));

    return {
      date,
      weekday: new Date(`${date}T12:00:00`).toLocaleDateString("en-AU", { weekday: "long" }),
      surf: {
        best: bestRating(surfForDay),
        windows: buildWindows(
          surfForDay,
          (h) => `${h.surfFt}ft, ${h.windKts}kt ${compassPoint(h.windDir)}`,
        ),
        hours: surfForDay,
      },
      foil: {
        best: bestRating(foilForDay),
        windows: buildWindows(foilForDay, (h) => `${h.windKts}kt ${compassPoint(h.windDir)}`),
        hours: foilForDay,
      },
    };
  });

  return { generatedAt: new Date().toISOString(), today: now.slice(0, 10), days };
}

/** Keeps the best-rated spot for each hour so the week view is one row per hour. */
function bestPerHour<T extends { time: string; rating: Rating }>(hours: T[]): T[] {
  const byTime = new Map<string, T>();
  for (const hour of hours) {
    const existing = byTime.get(hour.time);
    if (!existing || RATING_ORDER[hour.rating] > RATING_ORDER[existing.rating]) {
      byTime.set(hour.time, hour);
    }
  }
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}

function bestRating(hours: { rating: Rating }[]): Rating {
  return hours.reduce<Rating>(
    (best, h) => (RATING_ORDER[h.rating] > RATING_ORDER[best] ? h.rating : best),
    "poor",
  );
}

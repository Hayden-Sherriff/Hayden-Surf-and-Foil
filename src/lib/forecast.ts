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

export const TIMEZONE = "Australia/Brisbane";
const FORECAST_DAYS = 7;

type MarineResponse = {
  hourly: {
    time: string[];
    wave_height: (number | null)[];
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

async function fetchMarine(spots: { lat: number; lon: number }[]) {
  const { latitude, longitude } = coords(spots);
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=wave_height,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period` +
    `&timezone=${encodeURIComponent(TIMEZONE)}&forecast_days=${FORECAST_DAYS}`;
  return fetchJson<MarineResponse>(url);
}

async function fetchWind(spots: { lat: number; lon: number }[]) {
  const { latitude, longitude } = coords(spots);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn` +
    `&timezone=${encodeURIComponent(TIMEZONE)}&forecast_days=${FORECAST_DAYS}`;
  return fetchJson<WindResponse>(url);
}

function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

function isDaylight(time: string): boolean {
  const hour = hourOf(time);
  return hour >= THRESHOLDS.dayStartHour && hour <= THRESHOLDS.dayEndHour;
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
  days: DayForecast[];
};

export async function getWeekForecast(): Promise<WeekForecast> {
  const [marine, surfWind, foilWind] = await Promise.all([
    fetchMarine(SURF_SPOTS),
    fetchWind(SURF_SPOTS),
    fetchWind(FOIL_SPOTS),
  ]);

  const surfHours: SurfHour[] = [];
  SURF_SPOTS.forEach((spot, index) => {
    const sea = marine[index]?.hourly;
    const wind = surfWind[index]?.hourly;
    if (!sea || !wind) return;
    sea.time.forEach((time, i) => {
      if (!isDaylight(time)) return;
      const waveHeightM = sea.wave_height[i];
      const windKts = wind.wind_speed_10m[i];
      const windDir = wind.wind_direction_10m[i];
      if (waveHeightM == null || windKts == null || windDir == null) return;
      surfHours.push(
        rateSurfHour(spot, {
          time,
          waveHeightM,
          swellHeightM: sea.swell_wave_height[i] ?? waveHeightM,
          swellPeriodS: sea.swell_wave_period[i] ?? sea.wave_period[i] ?? 0,
          swellDir: sea.swell_wave_direction[i] ?? 0,
          windKts,
          windGustKts: wind.wind_gusts_10m[i] ?? windKts,
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
      if (!isDaylight(time)) return;
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

  const dates = [
    ...new Set([...surfHours, ...foilHours].map((h) => h.time.slice(0, 10))),
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

  return { generatedAt: new Date().toISOString(), days };
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

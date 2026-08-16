import Link from "next/link";
import { DayCard } from "@/components/DayCard";
import { RATING_ORDER, THRESHOLDS, type Rating } from "@/lib/conditions";
import { getWeekForecast, type DayForecast } from "@/lib/forecast";
import { formatWindow } from "@/lib/format";

export const metadata = { title: "Surf & Foil this week" };
/**
 * Rendered per request so a forecast outage during a deploy can't fail the build
 * or freeze into the prerendered payload; the 30 min cache lives on the fetches
 * themselves, so this costs a render, not an upstream call.
 */
export const dynamic = "force-dynamic";

/**
 * A forecast failure is deliberately left to throw into `error.tsx` rather than
 * rendering a page that looks like a quiet week.
 */
export default async function HomePage() {
  const week = await getWeekForecast();

  const surfPick = bestDay(week.days, (day) => day.surf.best);
  const foilPick = bestDay(week.days, (day) => day.foil.best);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">Surf &amp; Foil</h1>
          <p className="mt-1 text-sm text-slate-400">
            Next 7 days, South Straddie to Fingal. Surf counts when it is {THRESHOLDS.goodSurfFt}ft+
            with offshore wind; wing foiling when Currumbin is {THRESHOLDS.goodWindKts}kt+.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/spots" className="text-sm text-sky-400 hover:text-sky-300">
            Spot guide
          </Link>
          <form method="post" action="/api/logout">
            <button type="submit" className="text-sm text-slate-400 hover:text-slate-200">
              Log out
            </button>
          </form>
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Verdict label="Best surf this week" day={surfPick} kind="surf" />
        <Verdict label="Best wing foil this week" day={foilPick} kind="foil" />
      </div>

      <div className="mt-8 space-y-4">
        {week.days.map((day) => (
          <DayCard key={day.date} day={day} today={day.date === week.today} />
        ))}
      </div>

      <footer className="mt-10 text-xs text-slate-600">
        Wave and wind data from Open-Meteo (ECMWF/GFS marine + weather models), Brisbane time.
        Updated {new Date(week.generatedAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })}.
      </footer>
    </main>
  );
}

function Verdict({
  label,
  day,
  kind,
}: {
  label: string;
  day: DayForecast | null;
  kind: "surf" | "foil";
}) {
  const activity = day ? day[kind] : null;
  const window = activity?.windows.reduce<(typeof activity.windows)[number] | undefined>(
    (best, candidate) =>
      !best || RATING_ORDER[candidate.rating] > RATING_ORDER[best.rating] ? candidate : best,
    undefined,
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
      {day && activity && window ? (
        <>
          <p className="mt-2 text-xl font-semibold text-slate-100">
            {day.weekday} {formatWindow(window.startTime, window.endTime)}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {window.spotName} &middot; {window.headline}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xl font-semibold text-slate-400">
          {kind === "surf" ? "No good surf forecast" : "No foilable wind forecast"}
        </p>
      )}
    </div>
  );
}

function bestDay(days: DayForecast[], pick: (day: DayForecast) => Rating): DayForecast | null {
  const candidates = days.filter((day) => RATING_ORDER[pick(day)] >= RATING_ORDER.good);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (RATING_ORDER[pick(b)] > RATING_ORDER[pick(a)] ? b : a));
}

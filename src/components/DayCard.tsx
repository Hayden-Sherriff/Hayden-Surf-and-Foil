"use client";

import { useState } from "react";
import { RatingBadge } from "./RatingBadge";
import { compassPoint, RATING_ORDER, THRESHOLDS, type Rating } from "@/lib/conditions";
import type { DayForecast } from "@/lib/forecast";
import { formatDate, formatHour, formatWindow } from "@/lib/format";

export function DayCard({ day, today = false }: { day: DayForecast; today?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`rounded-2xl border bg-slate-900/60 p-5 ${
        today ? "border-sky-500/50" : "border-slate-800"
      }`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">
          {day.weekday}
          <span className="ml-2 text-sm font-normal text-slate-500">{formatDate(day.date)}</span>
          {today ? <span className="ml-2 text-xs font-medium text-sky-400">today</span> : null}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-xs font-medium text-sky-400 hover:text-sky-300"
        >
          {open ? "Hide hours" : "Hour by hour"}
        </button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ActivitySummary
          label="Surf"
          rating={day.surf.best}
          windows={day.surf.windows}
          emptyText={`No offshore ${THRESHOLDS.goodSurfFt}ft+ window`}
        />
        <ActivitySummary
          label="Wing foil"
          rating={day.foil.best}
          windows={day.foil.windows}
          emptyText={`Under ${THRESHOLDS.goodWindKts}kt at Currumbin`}
        />
      </div>

      {open ? (
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <HourTable
            title="Surf (best spot each hour)"
            columns={["Time", "Spot", "Size", "Wind", ""]}
            rows={day.surf.hours.map((hour) => [
              formatHour(hour.time),
              hour.spotName,
              `${hour.surfFt}ft ${hour.swellPeriodS}s`,
              `${hour.windKts}kt ${compassPoint(hour.windDir)} (${hour.windQuality})`,
              hour.rating,
            ])}
          />
          <HourTable
            title="Wing foil (Currumbin)"
            columns={["Time", "Spot", "Wind", "Gust", ""]}
            rows={day.foil.hours.map((hour) => [
              formatHour(hour.time),
              hour.spotName,
              `${hour.windKts}kt ${compassPoint(hour.windDir)}`,
              `${hour.windGustKts}kt`,
              hour.rating,
            ])}
          />
        </div>
      ) : null}
    </section>
  );
}

function ActivitySummary({
  label,
  rating,
  windows,
  emptyText,
}: {
  label: string;
  rating: Rating;
  windows: DayForecast["surf"]["windows"];
  emptyText: string;
}) {
  const go = RATING_ORDER[rating] >= RATING_ORDER.good;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{label}</h3>
        <RatingBadge rating={rating} />
      </div>

      {go && windows.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
          {windows.map((window) => (
            <li key={window.startTime}>
              <span className="font-semibold text-slate-100">
                {formatWindow(window.startTime, window.endTime)}
              </span>{" "}
              &middot; {window.spotName} &middot; {window.headline}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function HourTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: (string | Rating)[][];
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <table className="mt-2 w-full text-left text-xs text-slate-300">
        <thead className="text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="py-1 pr-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-800/60">
              {row.map((cell, cellIndex) =>
                cellIndex === row.length - 1 ? (
                  <td key={cellIndex} className="py-1">
                    <RatingBadge rating={cell as Rating} />
                  </td>
                ) : (
                  <td key={cellIndex} className="py-1 pr-2 whitespace-nowrap">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

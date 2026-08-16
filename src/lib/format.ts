/**
 * Forecast times arrive as naive Brisbane local strings (2026-08-16T06:00),
 * so they are formatted by slicing rather than going through Date to avoid the
 * server's own timezone shifting them.
 */
export function formatHour(time: string): string {
  const hour = Number(time.slice(11, 13)) % 24;
  const suffix = hour < 12 ? "am" : "pm";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}${suffix}`;
}

export function formatWindow(startTime: string, endTime: string): string {
  const endHour = Number(endTime.slice(11, 13)) + 1;
  const paddedEnd = `${endTime.slice(0, 11)}${String(endHour).padStart(2, "0")}:00`;
  return `${formatHour(startTime)}-${formatHour(paddedEnd)}`;
}

export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

/** Current Brisbane wall clock as a naive `YYYY-MM-DDTHH:mm` string. */
export function brisbaneNow(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function brisbaneToday(now = new Date()): string {
  return brisbaneNow(now).slice(0, 10);
}

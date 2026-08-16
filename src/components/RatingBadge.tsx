import type { Rating } from "@/lib/conditions";

const STYLES: Record<Rating, string> = {
  epic: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  good: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  fair: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  poor: "bg-slate-700/40 text-slate-400 border-slate-600/40",
};

const LABELS: Record<Rating, string> = {
  epic: "Epic",
  good: "Good",
  fair: "Fair",
  poor: "No go",
};

export function RatingBadge({ rating }: { rating: Rating }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STYLES[rating]}`}
    >
      {LABELS[rating]}
    </span>
  );
}

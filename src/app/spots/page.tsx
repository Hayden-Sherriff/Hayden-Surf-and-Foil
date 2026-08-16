import Link from "next/link";
import { compassPoint } from "@/lib/conditions";
import { FOIL_SPOTS, SURF_SPOTS } from "@/lib/spots";

export const metadata = { title: "Spot guide | Surf & Foil" };

export default function SpotsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold text-slate-100">Spot guide</h1>
        <Link href="/" className="text-sm text-sky-400 hover:text-sky-300">
          Back to the week
        </Link>
      </header>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-slate-500">Surf</h2>
      <div className="mt-3 space-y-3">
        {SURF_SPOTS.map((spot) => (
          <article key={spot.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="font-semibold text-slate-100">{spot.name}</h3>
            <p className="mt-1 text-xs text-slate-400">
              Offshore {compassPoint(spot.offshoreDir)} &middot; swell window{" "}
              {compassPoint(spot.swellWindow[0])}-{compassPoint(spot.swellWindow[1])} &middot; best on{" "}
              {compassPoint(spot.idealSwellDir)}
            </p>
            <p className="mt-2 text-sm text-slate-300">{spot.notes}</p>
          </article>
        ))}
      </div>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Wing foil
      </h2>
      <div className="mt-3 space-y-3">
        {FOIL_SPOTS.map((spot) => (
          <article key={spot.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="font-semibold text-slate-100">{spot.name}</h3>
            <p className="mt-1 text-xs text-slate-400">
              Best wind {compassPoint(spot.idealWindWindow[0])}-
              {compassPoint(spot.idealWindWindow[1])} &middot; sailable{" "}
              {compassPoint(spot.windWindow[0])}-{compassPoint(spot.windWindow[1])}
            </p>
            <p className="mt-2 text-sm text-slate-300">{spot.notes}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

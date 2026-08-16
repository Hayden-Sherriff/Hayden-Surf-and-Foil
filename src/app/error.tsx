"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-100">Forecast unavailable</h1>
      <p className="mt-2 text-slate-400">{error.message || "Could not load the forecast."}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Try again
      </button>
    </main>
  );
}

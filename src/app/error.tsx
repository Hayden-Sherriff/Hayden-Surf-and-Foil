"use client";

/**
 * Fixed copy rather than `error.message`: a production server error is redacted
 * to a generic string anyway, and anything that isn't redacted would be an
 * upstream URL or status that means nothing here.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-100">Forecast unavailable</h1>
      <p className="mt-2 text-slate-400">
        The forecast provider is not responding. Try again shortly.
      </p>
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

import { safeRedirectPath } from "@/lib/auth";

export const metadata = { title: "Log in | Surf & Foil" };

const ERRORS: Record<string, string> = {
  "1": "Wrong password, try again.",
  throttled: "Too many attempts. Wait 15 minutes and try again.",
  config: "Server is missing APP_PASSWORD or SESSION_SECRET.",
};

type QueryValue = string | string[] | undefined;

/** A repeated query parameter arrives as an array, so take the first value. */
function first(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: QueryValue; next?: QueryValue }>;
}) {
  const params = await searchParams;
  const error = first(params.error);
  // Own-property check so `?error=__proto__` can't resolve to an inherited value
  // that React refuses to render.
  const message = error && Object.hasOwn(ERRORS, error) ? ERRORS[error] : undefined;
  const destination = safeRedirectPath(first(params.next));

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <form
        method="post"
        action="/api/login"
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl"
      >
        <h1 className="text-2xl font-semibold text-slate-100">Surf &amp; Foil</h1>
        <p className="mt-1 text-sm text-slate-400">Burleigh to D-Bah, plus Currumbin wind.</p>

        <input type="hidden" name="next" value={destination} />

        <label htmlFor="password" className="mt-8 block text-sm font-medium text-slate-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
        />

        {message ? (
          <p className="mt-3 text-sm text-rose-400" role="alert">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-400"
        >
          Log in
        </button>
      </form>
    </main>
  );
}

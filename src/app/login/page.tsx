export const metadata = { title: "Log in | Surf & Foil" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <form
        method="post"
        action="/api/login"
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl"
      >
        <h1 className="text-2xl font-semibold text-slate-100">Surf &amp; Foil</h1>
        <p className="mt-1 text-sm text-slate-400">Burleigh to D-Bah, plus Currumbin wind.</p>

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

        {error ? (
          <p className="mt-3 text-sm text-rose-400" role="alert">
            Wrong password, try again.
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

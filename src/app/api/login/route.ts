import { NextResponse } from "next/server";
import {
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isSameOrigin,
  isValidPassword,
  safeRedirectPath,
  sessionCookieOptions,
} from "@/lib/auth";
import { clearAttempts, clientKey, isThrottled, recordFailure } from "@/lib/throttle";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Bad origin", { status: 403 });
  }

  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
    return NextResponse.redirect(new URL("/login?error=config", request.url), { status: 303 });
  }

  // The form is read before the throttle check so a throttled attempt can send the
  // requested page back to the login screen instead of losing the deep link.
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const destination = safeRedirectPath(form.get("next")?.toString());

  const backToLogin = (error: string) => {
    const retry = new URL("/login", request.url);
    retry.searchParams.set("error", error);
    if (destination !== "/") retry.searchParams.set("next", destination);
    return NextResponse.redirect(retry, { status: 303 });
  };

  const client = clientKey(request);
  if (isThrottled(client)) return backToLogin("throttled");

  if (!(await isValidPassword(password))) {
    recordFailure(client);
    return backToLogin("1");
  }
  clearAttempts(client);

  const response = NextResponse.redirect(new URL(destination, request.url), { status: 303 });
  response.cookies.set({
    ...sessionCookieOptions(request),
    value: await createSessionToken(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

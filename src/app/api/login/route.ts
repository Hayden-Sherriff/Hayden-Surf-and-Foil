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

  const client = clientKey(request);
  if (isThrottled(client)) {
    return NextResponse.redirect(new URL("/login?error=throttled", request.url), { status: 303 });
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const destination = safeRedirectPath(form.get("next")?.toString());

  if (!(await isValidPassword(password))) {
    recordFailure(client);
    const retry = new URL("/login", request.url);
    retry.searchParams.set("error", "1");
    if (destination !== "/") retry.searchParams.set("next", destination);
    return NextResponse.redirect(retry, { status: 303 });
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

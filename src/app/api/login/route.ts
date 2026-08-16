import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isSameOrigin,
  isValidPassword,
} from "@/lib/auth";
import { clearAttempts, isThrottled, recordFailure } from "@/lib/throttle";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Bad origin", { status: 403 });
  }

  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
    return NextResponse.redirect(new URL("/login?error=config", request.url), { status: 303 });
  }

  const client = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (isThrottled(client)) {
    return NextResponse.redirect(new URL("/login?error=throttled", request.url), { status: 303 });
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!(await isValidPassword(password))) {
    recordFailure(client);
    return NextResponse.redirect(new URL("/login?error=1", request.url), { status: 303 });
  }
  clearAttempts(client);

  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

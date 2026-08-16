import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  if (!process.env.SESSION_SECRET || !process.env.APP_PASSWORD) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(token)) return NextResponse.next();

  // Carry the requested page so a deep link (or a bookmark to /spots) survives
  // the login it triggered.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

/**
 * Everything is gated except the login screen, the two auth routes and static
 * assets, so a page added later is protected without touching this list. The
 * exclusions are anchored to whole path segments, so `/login-admin` would still
 * be gated.
 */
export const config = {
  matcher: ["/((?!login$|api/login$|api/logout$|_next/|favicon.ico$).*)"],
};

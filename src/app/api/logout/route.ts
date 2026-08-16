import { NextResponse } from "next/server";
import { isSameOrigin, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Bad origin", { status: 403 });
  }

  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.set({ ...sessionCookieOptions(request), value: "", maxAge: 0 });
  return response;
}

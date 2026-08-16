import { NextResponse } from "next/server";
import { SESSION_COOKIE_OPTIONS, isSameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Bad origin", { status: 403 });
  }

  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.set({ ...SESSION_COOKIE_OPTIONS, value: "", maxAge: 0 });
  return response;
}

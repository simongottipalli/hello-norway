import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionCookie,
  SESSION_SIG_COOKIE_NAME,
} from "@/lib/sessionCookieSig";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/login" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("session_token")?.value;
  const sessionSig = request.cookies.get(SESSION_SIG_COOKIE_NAME)?.value;

  if (!sessionToken || !sessionSig) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    // Fail closed: without the secret we cannot verify anything.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const valid = await verifySessionCookie(sessionToken, sessionSig, secret);
  if (!valid) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};

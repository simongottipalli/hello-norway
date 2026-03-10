import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionCookie,
  SESSION_SIG_COOKIE_NAME,
} from "@/lib/sessionCookieSig";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes that authenticated users should not access
  const authOnlyPaths = ["/login", "/signup"];
  
  // Protected routes that require authentication
  // Note: These paths use startsWith matching, so /tasks protects /tasks/* sub-routes
  const protectedPaths = ["/dashboard", "/tasks", "/profile"];

  // Allow static files and API routes to pass through
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Check if current path is protected or auth-only
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  const isAuthPath = authOnlyPaths.some((path) => pathname.startsWith(path));

  // Skip authentication check if path is neither protected nor auth-only
  if (!isProtectedPath && !isAuthPath) {
    return NextResponse.next();
  }

  // Only verify session for paths that need authentication checks
  const sessionToken = request.cookies.get("session_token")?.value;
  const sessionSig = request.cookies.get(SESSION_SIG_COOKIE_NAME)?.value;

  // Check if session is valid
  let isAuthenticated = false;
  if (sessionToken && sessionSig) {
    const secret = process.env.SESSION_COOKIE_SECRET;
    if (secret) {
      isAuthenticated = await verifySessionCookie(sessionToken, sessionSig, secret);
    }
  }

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    // Include both pathname and search params in redirect
    const redirectPath = pathname + request.nextUrl.search;
    loginUrl.searchParams.set("redirect", redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/signup to dashboard
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow public paths and authenticated access to protected paths
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

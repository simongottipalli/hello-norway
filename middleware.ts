import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionCookie,
  SESSION_SIG_COOKIE_NAME,
} from "@/lib/sessionCookieSig";
import {
  verifyAdminSessionCookie,
  ADMIN_SESSION_TOKEN_COOKIE_NAME,
  ADMIN_SESSION_SIG_COOKIE_NAME,
} from "@/lib/adminSessionCookieSig";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and API routes to pass through
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // ── Admin portal ────────────────────────────────────────────────────────
  // Block direct access to the internal /portal path so the public URL
  // (configured via ADMIN_PATH) is the only entry point.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const adminPath = process.env.ADMIN_PATH;
  if (adminPath && (pathname === `/${adminPath}` || pathname.startsWith(`/${adminPath}/`))) {
    // Map the public /{ADMIN_PATH}/* URL to the internal /portal/* path for
    // auth checking, then rewrite. Auth is checked here (before the rewrite)
    // so unauthenticated requests are redirected without serving page content.
    const rest = pathname.slice(`/${adminPath}`.length) || "/";
    const internalPath = `/portal${rest === "/" ? "" : rest}`;

    const isAdminProtectedPath =
      internalPath === "/portal/dashboard" || internalPath.startsWith("/portal/dashboard/");
    const isAdminLoginPath =
      internalPath === "/portal/login" || internalPath.startsWith("/portal/login/");

    const adminSessionToken = request.cookies.get(ADMIN_SESSION_TOKEN_COOKIE_NAME)?.value;
    const adminSessionSig = request.cookies.get(ADMIN_SESSION_SIG_COOKIE_NAME)?.value;

    let isAdminAuthenticated = false;
    if (adminSessionToken && adminSessionSig) {
      const secret = process.env.ADMIN_SESSION_COOKIE_SECRET;
      if (secret) {
        isAdminAuthenticated = await verifyAdminSessionCookie(
          adminSessionToken,
          adminSessionSig,
          secret,
        );
      }
    }

    if (isAdminProtectedPath && !isAdminAuthenticated) {
      return NextResponse.redirect(new URL(`/${adminPath}/login`, request.url));
    }
    if (isAdminLoginPath && isAdminAuthenticated) {
      return NextResponse.redirect(new URL(`/${adminPath}/dashboard`, request.url));
    }

    // Auth check passed — rewrite to the internal /portal path.
    return NextResponse.rewrite(new URL(internalPath || "/portal", request.url));
  }

  // ── Regular user routes ─────────────────────────────────────────────────

  // Routes that authenticated users should not access
  const authOnlyPaths = ["/login"];

  // Protected routes that require authentication
  const protectedPaths = ["/dashboard", "/profile"];

  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
  const isAuthPath = authOnlyPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  if (!isProtectedPath && !isAuthPath) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("session_token")?.value;
  const sessionSig = request.cookies.get(SESSION_SIG_COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (sessionToken && sessionSig) {
    const secret = process.env.SESSION_COOKIE_SECRET;
    if (secret) {
      isAuthenticated = await verifySessionCookie(sessionToken, sessionSig, secret);
    }
  }

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const redirectPath = pathname + request.nextUrl.search;
    loginUrl.searchParams.set("redirect", redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

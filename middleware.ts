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
  // Block direct access to the internal /portal path. The public URL is the
  // value of ADMIN_PATH, rewritten to /portal by next.config.ts rewrites.
  // Without this guard anyone who knows the /portal path could bypass the
  // obscurity provided by ADMIN_PATH.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect admin portal pages that were reached via the rewrite.
  // next.config.ts rewrites /{ADMIN_PATH}/* → /portal/*; at this point in
  // the middleware the rewritten (internal) pathname is visible.
  const adminPortalProtected = ["/portal/dashboard"];
  const adminPortalLoginPath = "/portal/login";

  const isAdminProtectedPath = adminPortalProtected.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isAdminLoginPath =
    pathname === adminPortalLoginPath || pathname.startsWith(adminPortalLoginPath + "/");

  if (isAdminProtectedPath || isAdminLoginPath) {
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

    const adminPath = process.env.ADMIN_PATH;
    const adminLoginPublicUrl = adminPath ? `/${adminPath}/login` : adminPortalLoginPath;
    const adminDashboardPublicUrl = adminPath ? `/${adminPath}/dashboard` : "/portal/dashboard";

    if (isAdminProtectedPath && !isAdminAuthenticated) {
      return NextResponse.redirect(new URL(adminLoginPublicUrl, request.url));
    }

    if (isAdminLoginPath && isAdminAuthenticated) {
      return NextResponse.redirect(new URL(adminDashboardPublicUrl, request.url));
    }

    return NextResponse.next();
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

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";
import { createChildLogger } from "@/lib/logger";
import { SESSION_SIG_COOKIE_NAME } from "@/lib/sessionCookieSig";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/auth/logout", method: "POST" });

  try {
    const cookie = request.headers.get("cookie");
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "X-Request-ID": requestId,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    const expiredCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };

    nextResponse.cookies.set("session_token", "", expiredCookieOptions);
    nextResponse.cookies.set(SESSION_SIG_COOKIE_NAME, "", expiredCookieOptions);

    return nextResponse;
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Failed to logout" });
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";
import {
  ADMIN_SESSION_TOKEN_COOKIE_NAME,
  ADMIN_SESSION_SIG_COOKIE_NAME,
  signAdminSessionCookie,
} from "@/lib/adminSessionCookieSig";

const ADMIN_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/admin/otp/verify" });

  try {
    const body = await request.json();
    logger.info({ msg: "Forwarding admin OTP verification request to Express" });

    const response = await fetch(`${API_BASE_URL}/admin/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const responseBody = { ...data };

    if (response.ok && responseBody.success && responseBody.sessionToken) {
      const sessionToken = responseBody.sessionToken;
      delete responseBody.sessionToken;

      const nextResponse = NextResponse.json(responseBody, { status: response.status });

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      };

      nextResponse.cookies.set(ADMIN_SESSION_TOKEN_COOKIE_NAME, sessionToken, cookieOptions);

      const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
      const sessionSig = await signAdminSessionCookie(sessionToken, expiresAt);
      nextResponse.cookies.set(ADMIN_SESSION_SIG_COOKIE_NAME, sessionSig, cookieOptions);

      return nextResponse;
    }

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Error in admin OTP verify route" });
    return NextResponse.json({ error: "Failed to verify admin OTP" }, { status: 500 });
  }
}

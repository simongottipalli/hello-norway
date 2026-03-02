import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  // Generate request ID for tracing
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/otp/verify' });

  try {
    const body = await request.json();

    logger.info({ msg: 'Forwarding OTP verification request to Express', email: body.email });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(body),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    logger.info({
      msg: 'Received response from Express',
      statusCode: response.status,
      duration: `${duration}ms`,
    });

    // Create NextResponse with status
    const responseBody = { ...data };
    if (response.ok && responseBody.success && responseBody.sessionToken) {
      const sessionToken = responseBody.sessionToken;
      delete responseBody.sessionToken;
      const nextResponse = NextResponse.json(responseBody, { status: response.status });
      nextResponse.cookies.set("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      return nextResponse;
    }

    const nextResponse = NextResponse.json(responseBody, { status: response.status });

    // Propagate relevant headers from backend response
    const headersToPropagate = [
      'Retry-After',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ];

    headersToPropagate.forEach(headerName => {
      const headerValue = response.headers.get(headerName);
      if (headerValue) {
        nextResponse.headers.set(headerName, headerValue);
      }
    });

    return nextResponse;
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Error in OTP verify route" });
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}

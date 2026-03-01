import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";

const API_URL = process.env.API_BASE_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  // Generate request ID for tracing
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/otp/verify' });

  try {
    const body = await request.json();

    logger.info({ msg: 'Forwarding OTP verification request to Express', email: body.email });
    const startTime = Date.now();

    const response = await fetch(`${API_URL}/otp/verify`, {
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
    const nextResponse = NextResponse.json(data, { status: response.status });

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
    logger.error({ msg: "Error in OTP verify route", error });
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}

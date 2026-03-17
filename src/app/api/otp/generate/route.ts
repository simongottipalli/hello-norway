import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";
import { forwardRateLimitHeaders } from "../routeHelpers";

export async function POST(request: NextRequest) {
  // Generate request ID for tracing
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/otp/generate' });

  try {
    const body = await request.json();

    logger.info({ msg: 'Forwarding OTP generation request to Express', email: body.email });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/otp/generate`, {
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
    forwardRateLimitHeaders(response, nextResponse);
    return nextResponse;
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Error in OTP generate route" });
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";
import { forwardRateLimitHeaders } from "@/app/api/otp/routeHelpers";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/admin/otp/generate" });

  try {
    const body = await request.json();
    logger.info({ msg: "Forwarding admin OTP generate request to Express" });

    const response = await fetch(`${API_BASE_URL}/admin/otp/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    forwardRateLimitHeaders(response, nextResponse);
    return nextResponse;
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Error in admin OTP generate route" });
    return NextResponse.json({ error: "Failed to send admin OTP" }, { status: 500 });
  }
}

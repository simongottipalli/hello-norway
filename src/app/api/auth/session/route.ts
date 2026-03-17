import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";
import { clearSessionCookies } from "@/lib/sessionCookieSig";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/auth/session", method: "GET" });

  try {
    const cookie = request.headers.get("cookie");
    const response = await fetch(`${API_BASE_URL}/auth/session`, {
      headers: {
        "X-Request-ID": requestId,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });

    if (response.status === 401) {
      clearSessionCookies(nextResponse);
    }

    return nextResponse;
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Failed to fetch session" });
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

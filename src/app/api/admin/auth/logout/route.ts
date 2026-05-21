import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";
import { clearAdminSessionCookies } from "@/lib/adminSessionCookieSig";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/admin/auth/logout" });

  try {
    const cookie = request.headers.get("cookie");
    const response = await fetch(`${API_BASE_URL}/admin/auth/logout`, {
      method: "POST",
      headers: {
        "X-Request-ID": requestId,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    clearAdminSessionCookies(nextResponse);
    return nextResponse;
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Failed to logout admin" });
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}

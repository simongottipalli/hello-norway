import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";
import { createChildLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/auth/profile", method: "GET" });

  try {
    const cookie = request.headers.get("cookie");
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        "X-Request-ID": requestId,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Failed to fetch profile" });
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/auth/profile", method: "PATCH" });

  try {
    const cookie = request.headers.get("cookie");
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Failed to update auth profile" });
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

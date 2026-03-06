import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/tasks/personalized", method: "GET" });

  try {
    const cookie = request.headers.get("cookie");
    const response = await fetch(`${API_BASE_URL}/tasks/personalized`, {
      headers: {
        "X-Request-ID": requestId,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Failed to fetch personalized tasks" });
    return NextResponse.json({ error: "Failed to fetch personalized tasks" }, { status: 500 });
  }
}

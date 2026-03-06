import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: "/api/onboarding/tasks", method: "POST" });

  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/onboarding/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Failed to fetch onboarding tasks" });
    return NextResponse.json({ error: "Failed to fetch onboarding tasks" }, { status: 500 });
  }
}

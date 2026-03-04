import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/tasks/[id]/status', method: 'PATCH' });

  try {
    const { id } = await params;
    const cookie = request.headers.get("cookie");
    const body = await request.json();

    logger.info({ msg: 'Updating task status', taskId: id });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        ...(cookie ? { Cookie: cookie } : {}),
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

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error, msg: 'Failed to update task status' });
    return NextResponse.json(
      { error: "Failed to update task status" },
      { status: 500 }
    );
  }
}

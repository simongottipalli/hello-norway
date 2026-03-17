import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/tasks/[id]', method: 'GET' });

  try {
    const { id } = await params;
    const cookie = request.headers.get("cookie");

    logger.info({ msg: 'Fetching task by id', taskId: id });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "GET",
      headers: {
        "X-Request-ID": requestId,
        ...(cookie ? { Cookie: cookie } : {}),
      },
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
    logger.error({ err: error, msg: 'Failed to fetch task' });
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/config";

export async function GET() {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/tasks', method: 'GET' });

  try {
    logger.info({ msg: 'Fetching all tasks' });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: {
        "X-Request-ID": requestId,
      },
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    logger.info({
      msg: 'Received response from Express',
      statusCode: response.status,
      duration: `${duration}ms`,
      count: Array.isArray(data) ? data.length : 0,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error, msg: 'Failed to fetch tasks' });
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/tasks', method: 'POST' });

  try {
    const body = await request.json();

    logger.info({ msg: 'Creating new task', slug: body.slug });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/tasks`, {
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

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error, msg: 'Failed to create task' });
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

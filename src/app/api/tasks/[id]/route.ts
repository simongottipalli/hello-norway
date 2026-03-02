import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "@/lib/logger";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/tasks/[id]', method: 'GET' });

  try {
    const { id } = await params;

    logger.info({ msg: 'Fetching task by id', taskId: id });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "GET",
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/tasks/[id]', method: 'PATCH' });

  try {
    const { id } = await params;
    const body = await request.json();

    logger.info({ msg: 'Updating task', taskId: id });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "PATCH",
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

    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error, msg: 'Failed to update task' });
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = randomUUID();
  const logger = createChildLogger({ requestId, route: '/api/tasks/[id]', method: 'DELETE' });

  try {
    const { id } = await params;

    logger.info({ msg: 'Deleting task', taskId: id });
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: {
        "X-Request-ID": requestId,
      },
    });

    const duration = Date.now() - startTime;

    logger.info({
      msg: 'Received response from Express',
      statusCode: response.status,
      duration: `${duration}ms`,
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error, msg: 'Failed to delete task' });
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

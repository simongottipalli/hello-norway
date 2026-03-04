import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { NextFunction, Request, Response } from "express";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

vi.mock("../middleware/authMiddleware", () => ({
  authenticateSession: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: "test-user-id", email: "test@example.com", name: "Test User" };
    req.session = { id: "test-session-id", token: "test-token", expiresAt: new Date(Date.now() + 60_000) };
    next();
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userTask: {
      upsert: vi.fn(),
    },
  },
}));

const app = createApp();

describe("Task status updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates task status for the authenticated user", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue({ id: "task-1" } as never);
    vi.mocked(prisma.userTask.upsert).mockResolvedValue({
      id: "user-task-1",
      userId: "test-user-id",
      taskId: "task-1",
      status: "DONE",
      completedAt: new Date("2026-03-04T00:00:00.000Z"),
    } as never);

    const response = await request(app)
      .patch("/api/tasks/task-1")
      .send({ status: "DONE" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("DONE");
    expect(prisma.userTask.upsert).toHaveBeenCalledTimes(1);

    const upsertArg = vi.mocked(prisma.userTask.upsert).mock.calls[0][0];
    expect(upsertArg).toBeDefined();
    // Ensure the status is updated to DONE and completedAt is set
    expect(upsertArg.update.status).toBe("DONE");
    expect(upsertArg.update.completedAt).toBeInstanceOf(Date);
  });

  it("clears completedAt when status is not DONE", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue({ id: "task-2" } as never);
    vi.mocked(prisma.userTask.upsert).mockResolvedValue({
      id: "user-task-2",
      userId: "test-user-id",
      taskId: "task-2",
      status: "SAVED",
      completedAt: null,
    } as never);

    const response = await request(app)
      .patch("/api/tasks/task-2")
      .send({ status: "SAVED" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("SAVED");
    expect(prisma.userTask.upsert).toHaveBeenCalledTimes(1);

    const upsertArg = vi.mocked(prisma.userTask.upsert).mock.calls[0][0];
    expect(upsertArg).toBeDefined();
    // Ensure the status is updated to a non-DONE value and completedAt is cleared
    expect(upsertArg.update.status).toBe("SAVED");
    expect(upsertArg.update.completedAt == null).toBe(true);
  });
  it("returns 400 for invalid task status", async () => {
    const response = await request(app)
      .patch("/api/tasks/task-1")
      .send({ status: "INVALID" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid status");
    expect(prisma.userTask.upsert).not.toHaveBeenCalled();
  });

  it("returns 404 when task does not exist", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/tasks/missing-task")
      .send({ status: "SAVED" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Task not found");
    expect(prisma.userTask.upsert).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { NextFunction, Request, Response } from "express";
import type { UserTask } from "@prisma/client";
import { createApp } from "../app";
import * as taskRepo from "../repo/taskRepo";

vi.mock("../middleware/authMiddleware", () => ({
  authenticateSession: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: "test-user-id", email: "test@example.com", name: "Test User" };
    req.session = { id: "test-session-id", token: "test-token", expiresAt: new Date(Date.now() + 60_000) };
    next();
  },
}));

vi.mock("../repo/taskRepo", () => ({
  findUserTasksWithTask: vi.fn(),
  findTaskById: vi.fn(),
  findOwnedOrSystemTask: vi.fn(),
  createTask: vi.fn(),
  createUserTaskAssignment: vi.fn(),
  upsertUserTaskStatus: vi.fn(),
  findOnboardingPreviewTasks: vi.fn(),
}));

const app = createApp();

describe("Task status updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates task status for the authenticated user", async () => {
    vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-1" });
    vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({
      id: "user-task-1",
      userId: "test-user-id",
      taskId: "task-1",
      status: "DONE",
      completedAt: new Date("2026-03-04T00:00:00.000Z"),
    } as unknown as UserTask);

    const response = await request(app)
      .patch("/api/tasks/task-1/status")
      .send({ status: "DONE" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("DONE");
    expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledTimes(1);
    expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledWith(
      "test-user-id",
      "task-1",
      expect.objectContaining({ status: "DONE", completedAt: expect.any(Date) }),
    );
  });

  it("clears completedAt when status is not DONE", async () => {
    vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-2" });
    vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({
      id: "user-task-2",
      userId: "test-user-id",
      taskId: "task-2",
      status: "SAVED",
      completedAt: null,
    } as unknown as UserTask);

    const response = await request(app)
      .patch("/api/tasks/task-2/status")
      .send({ status: "SAVED" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("SAVED");
    expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledTimes(1);
    const [, , data] = vi.mocked(taskRepo.upsertUserTaskStatus).mock.calls[0];
    expect(data.completedAt).toBeNull();
  });

  it("sets dueDate when a valid dueDate is provided", async () => {
    vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-3" });
    const expectedDueDate = new Date("2026-03-15");
    vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({
      id: "user-task-3",
      userId: "test-user-id",
      taskId: "task-3",
      status: "TODO",
      dueDate: expectedDueDate,
      completedAt: null,
    } as unknown as UserTask);

    const response = await request(app)
      .patch("/api/tasks/task-3/status")
      .send({ status: "TODO", dueDate: "2026-03-15" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledTimes(1);
    const [, , data] = vi.mocked(taskRepo.upsertUserTaskStatus).mock.calls[0];
    expect(data.dueDate).toBeInstanceOf(Date);
    expect((data.dueDate as Date).toISOString().split("T")[0]).toBe("2026-03-15");
  });

  it("clears dueDate when null is provided", async () => {
    vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-4" });
    vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({
      id: "user-task-4",
      userId: "test-user-id",
      taskId: "task-4",
      status: "TODO",
      dueDate: null,
      completedAt: null,
    } as unknown as UserTask);

    const response = await request(app)
      .patch("/api/tasks/task-4/status")
      .send({ status: "TODO", dueDate: null })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledTimes(1);
    const [, , data] = vi.mocked(taskRepo.upsertUserTaskStatus).mock.calls[0];
    expect(data.dueDate).toBeNull();
  });

  it("returns 400 for invalid dueDate values", async () => {
    const response = await request(app)
      .patch("/api/tasks/task-1/status")
      .send({ status: "TODO", dueDate: "not-a-date" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid dueDate");
    expect(taskRepo.upsertUserTaskStatus).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid-but-parsable dueDate values", async () => {
    const response = await request(app)
      .patch("/api/tasks/task-1/status")
      .send({ status: "TODO", dueDate: "2026-02-30" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid dueDate");
    expect(taskRepo.upsertUserTaskStatus).not.toHaveBeenCalled();
  });

  it("returns 400 for non-string dueDate types", async () => {
    const numericResponse = await request(app)
      .patch("/api/tasks/task-1/status")
      .send({ status: "TODO", dueDate: 1234567890 })
      .set("Content-Type", "application/json");

    expect(numericResponse.status).toBe(400);
    expect(numericResponse.body.error).toContain("Invalid dueDate");
    expect(taskRepo.upsertUserTaskStatus).not.toHaveBeenCalled();

    const objectResponse = await request(app)
      .patch("/api/tasks/task-1/status")
      .send({ status: "TODO", dueDate: { date: "2026-01-01" } })
      .set("Content-Type", "application/json");

    expect(objectResponse.status).toBe(400);
    expect(objectResponse.body.error).toContain("Invalid dueDate");
    expect(taskRepo.upsertUserTaskStatus).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid task status", async () => {
    const response = await request(app)
      .patch("/api/tasks/task-1/status")
      .send({ status: "INVALID" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid status");
    expect(taskRepo.upsertUserTaskStatus).not.toHaveBeenCalled();
  });

  it("updates task status with private notes", async () => {
    vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-3" });
    vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({
      id: "user-task-3",
      userId: "test-user-id",
      taskId: "task-3",
      status: "SAVED",
      personalNotes: "Bring all paperwork copies",
      completedAt: null,
    } as unknown as UserTask);

    const response = await request(app)
      .patch("/api/tasks/task-3/status")
      .send({ status: "SAVED", personalNotes: "Bring all paperwork copies" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.personalNotes).toBe("Bring all paperwork copies");
    expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledTimes(1);
    const [, , data] = vi.mocked(taskRepo.upsertUserTaskStatus).mock.calls[0];
    expect(data.personalNotes).toBe("Bring all paperwork copies");
  });

  it("returns 400 for invalid personalNotes type", async () => {
    const response = await request(app)
      .patch("/api/tasks/task-1/status")
      .send({ status: "SAVED", personalNotes: 123 })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid personalNotes");
    expect(taskRepo.upsertUserTaskStatus).not.toHaveBeenCalled();
  });

  it("returns 404 when task does not exist", async () => {
    vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/tasks/missing-task/status")
      .send({ status: "SAVED" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Task not found");
    expect(taskRepo.upsertUserTaskStatus).not.toHaveBeenCalled();
  });

  it("accepts product status aliases and maps them to persisted enum values", async () => {
    vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-5" });
    vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({
      id: "user-task-5",
      userId: "test-user-id",
      taskId: "task-5",
      status: "SAVED",
      completedAt: null,
    } as unknown as UserTask);

    const response = await request(app)
      .patch("/api/tasks/task-5/status")
      .send({ status: "in_progress" })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledTimes(1);
    const [, , data] = vi.mocked(taskRepo.upsertUserTaskStatus).mock.calls[0];
    expect(data.status).toBe("SAVED");
  });
});

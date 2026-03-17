import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserTaskStatus } from "../../generated/prisma/client.js";
import * as taskService from "../../services/taskService";
import * as taskRepo from "../../repo/taskRepo";
import { prisma } from "../../lib/prisma";

vi.mock("../../repo/taskRepo", () => ({
  findAllSystemTasks: vi.fn(),
  findUserTasksWithTask: vi.fn(),
  findTaskById: vi.fn(),
  findTaskOwnership: vi.fn(),
  findOwnedOrSystemTask: vi.fn(),
  createTask: vi.fn(),
  createUserTaskAssignment: vi.fn(),
  updateTask: vi.fn(),
  upsertUserTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

describe("taskService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // getAllTasks
  // ──────────────────────────────────────────────

  describe("getAllTasks", () => {
    it("delegates to taskRepo.findAllSystemTasks", async () => {
      const mockTasks = [{ id: "task-1", title: "Task 1" }];
      vi.mocked(taskRepo.findAllSystemTasks).mockResolvedValue(mockTasks as never);

      const result = await taskService.getAllTasks();

      expect(taskRepo.findAllSystemTasks).toHaveBeenCalledOnce();
      expect(result).toEqual(mockTasks);
    });
  });

  // ──────────────────────────────────────────────
  // getUserTasks
  // ──────────────────────────────────────────────

  describe("getUserTasks", () => {
    it("returns user tasks merged with task fields", async () => {
      const mockUserTask = {
        id: "user-task-1",
        status: UserTaskStatus.TODO,
        dueDate: null,
        personalNotes: null,
        completedAt: null,
        task: { id: "task-1", title: "Task 1", slug: "task-1" },
      };
      vi.mocked(taskRepo.findUserTasksWithTask).mockResolvedValue([mockUserTask] as never);

      const result = await taskService.getUserTasks("user-1");

      expect(taskRepo.findUserTasksWithTask).toHaveBeenCalledWith("user-1");
      expect(result).toEqual([
        {
          id: "task-1",
          title: "Task 1",
          slug: "task-1",
          userTaskId: "user-task-1",
          status: UserTaskStatus.TODO,
          dueDate: null,
          personalNotes: null,
          completedAt: null,
        },
      ]);
    });

    it("returns an empty array when the user has no tasks", async () => {
      vi.mocked(taskRepo.findUserTasksWithTask).mockResolvedValue([]);

      const result = await taskService.getUserTasks("user-1");

      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // getTaskById
  // ──────────────────────────────────────────────

  describe("getTaskById", () => {
    it("returns the task when found and owned by the requester", async () => {
      const mockTask = { id: "task-1", title: "Task 1", createdByUserId: "user-1" };
      vi.mocked(taskRepo.findTaskById).mockResolvedValue(mockTask as never);

      const result = await taskService.getTaskById("task-1", "user-1");

      expect(result).toEqual({ success: true, data: mockTask });
    });

    it("returns the task when it is a system task (createdByUserId null)", async () => {
      const mockTask = { id: "task-1", title: "System Task", createdByUserId: null };
      vi.mocked(taskRepo.findTaskById).mockResolvedValue(mockTask as never);

      const result = await taskService.getTaskById("task-1", "any-user");

      expect(result).toEqual({ success: true, data: mockTask });
    });

    it("returns 404 when the task does not exist", async () => {
      vi.mocked(taskRepo.findTaskById).mockResolvedValue(null);

      const result = await taskService.getTaskById("nonexistent", "user-1");

      expect(result).toEqual({ success: false, statusCode: 404, error: "Task not found" });
    });

    it("returns 404 when the task is owned by another user", async () => {
      const mockTask = { id: "task-1", title: "Private Task", createdByUserId: "other-user" };
      vi.mocked(taskRepo.findTaskById).mockResolvedValue(mockTask as never);

      const result = await taskService.getTaskById("task-1", "user-1");

      expect(result).toEqual({ success: false, statusCode: 404, error: "Task not found" });
    });
  });

  // ──────────────────────────────────────────────
  // createTask
  // ──────────────────────────────────────────────

  describe("createTask", () => {
    const payload = {
      slug: "my-task",
      title: "My Task",
      shortDescription: "Short",
      body: "Body",
      category: "OTHER" as never,
      sortOrder: 10,
      requiresEmploymentStatus: [],
    };

    it("creates a task and auto-assigns it to the creator via a transaction", async () => {
      const createdTask = { id: "task-1", ...payload };
      vi.mocked(taskRepo.createTask).mockResolvedValue(createdTask as never);
      vi.mocked(taskRepo.createUserTaskAssignment).mockResolvedValue({} as never);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn({} as never));

      const result = await taskService.createTask(payload, "user-1");

      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(result).toEqual({ success: true, data: createdTask });
    });

    it("includes createdByUserId in the task data passed to the repo", async () => {
      const createdTask = { id: "task-1", ...payload, createdByUserId: "user-1" };
      vi.mocked(taskRepo.createTask).mockResolvedValue(createdTask as never);
      vi.mocked(taskRepo.createUserTaskAssignment).mockResolvedValue({} as never);

      let capturedTaskData: unknown;
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({} as never);
      });
      vi.mocked(taskRepo.createTask).mockImplementation(async (data) => {
        capturedTaskData = data;
        return createdTask as never;
      });

      await taskService.createTask(payload, "user-1");

      expect((capturedTaskData as { createdByUserId: string }).createdByUserId).toBe("user-1");
    });
  });

  // ──────────────────────────────────────────────
  // updateTask
  // ──────────────────────────────────────────────

  describe("updateTask", () => {
    it("returns the updated task on success", async () => {
      const existing = { createdByUserId: "user-1", minDaysFromArrival: null, maxDaysFromArrival: null };
      const updatedTask = { id: "task-1", title: "Updated" };
      vi.mocked(taskRepo.findTaskOwnership).mockResolvedValue(existing as never);
      vi.mocked(taskRepo.updateTask).mockResolvedValue(updatedTask as never);

      const result = await taskService.updateTask("task-1", { title: "Updated" }, "user-1");

      expect(result).toEqual({ success: true, data: updatedTask });
    });

    it("returns 404 when the task does not exist", async () => {
      vi.mocked(taskRepo.findTaskOwnership).mockResolvedValue(null);

      const result = await taskService.updateTask("nonexistent", { title: "X" }, "user-1");

      expect(result).toEqual({ success: false, statusCode: 404, error: "Task not found" });
      expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });

    it("returns 404 when the task is owned by another user", async () => {
      const existing = { createdByUserId: "other-user", minDaysFromArrival: null, maxDaysFromArrival: null };
      vi.mocked(taskRepo.findTaskOwnership).mockResolvedValue(existing as never);

      const result = await taskService.updateTask("task-1", { title: "X" }, "user-1");

      expect(result).toEqual({ success: false, statusCode: 404, error: "Task not found" });
      expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });

    it("returns 400 when maxDaysFromArrival < minDaysFromArrival", async () => {
      const existing = { createdByUserId: "user-1", minDaysFromArrival: 10, maxDaysFromArrival: 20 };
      vi.mocked(taskRepo.findTaskOwnership).mockResolvedValue(existing as never);

      const result = await taskService.updateTask("task-1", { maxDaysFromArrival: 5 }, "user-1");

      expect(result).toEqual({
        success: false,
        statusCode: 400,
        error: "maxDaysFromArrival must be greater than or equal to minDaysFromArrival",
      });
      expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // updateTaskStatus
  // ──────────────────────────────────────────────

  describe("updateTaskStatus", () => {
    it("resolves canonical status string to enum and upserts", async () => {
      vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-1" } as never);
      const userTask = { userId: "user-1", taskId: "task-1", status: UserTaskStatus.TODO };
      vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue(userTask as never);

      const result = await taskService.updateTaskStatus("task-1", "not_started", "user-1", {});

      expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledWith(
        "user-1",
        "task-1",
        expect.objectContaining({ status: UserTaskStatus.TODO }),
      );
      expect(result).toEqual({ success: true, data: userTask });
    });

    it("resolves legacy alias 'done' to DONE status", async () => {
      vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-1" } as never);
      vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({} as never);

      await taskService.updateTaskStatus("task-1", "done", "user-1", {});

      expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledWith(
        "user-1",
        "task-1",
        expect.objectContaining({ status: UserTaskStatus.DONE }),
      );
    });

    it("sets completedAt when status resolves to DONE", async () => {
      vi.useFakeTimers();
      const now = new Date("2026-01-01T00:00:00Z");
      vi.setSystemTime(now);

      vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-1" } as never);
      vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({} as never);

      await taskService.updateTaskStatus("task-1", "completed", "user-1", {});

      expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledWith(
        "user-1",
        "task-1",
        expect.objectContaining({ completedAt: now }),
      );

      vi.useRealTimers();
    });

    it("sets completedAt to null when status is not DONE", async () => {
      vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue({ id: "task-1" } as never);
      vi.mocked(taskRepo.upsertUserTaskStatus).mockResolvedValue({} as never);

      await taskService.updateTaskStatus("task-1", "in_progress", "user-1", {});

      expect(taskRepo.upsertUserTaskStatus).toHaveBeenCalledWith(
        "user-1",
        "task-1",
        expect.objectContaining({ completedAt: null }),
      );
    });

    it("returns 400 for an unrecognised status string", async () => {
      const result = await taskService.updateTaskStatus("task-1", "invalid_status", "user-1", {});

      expect(result).toEqual({
        success: false,
        statusCode: 400,
        error: "Invalid status. Use one of: not_started, in_progress, completed (legacy aliases: todo, saved, done)",
      });
      expect(taskRepo.findOwnedOrSystemTask).not.toHaveBeenCalled();
    });

    it("returns 404 when the task is not found or inaccessible", async () => {
      vi.mocked(taskRepo.findOwnedOrSystemTask).mockResolvedValue(null);

      const result = await taskService.updateTaskStatus("nonexistent", "not_started", "user-1", {});

      expect(result).toEqual({ success: false, statusCode: 404, error: "Task not found" });
      expect(taskRepo.upsertUserTaskStatus).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // deleteTask
  // ──────────────────────────────────────────────

  describe("deleteTask", () => {
    it("deletes the task and returns success", async () => {
      vi.mocked(taskRepo.findTaskOwnership).mockResolvedValue({ createdByUserId: "user-1", minDaysFromArrival: null, maxDaysFromArrival: null } as never);
      vi.mocked(taskRepo.deleteTask).mockResolvedValue({} as never);

      const result = await taskService.deleteTask("task-1", "user-1");

      expect(taskRepo.deleteTask).toHaveBeenCalledWith("task-1");
      expect(result).toEqual({ success: true });
    });

    it("returns 404 when the task does not exist", async () => {
      vi.mocked(taskRepo.findTaskOwnership).mockResolvedValue(null);

      const result = await taskService.deleteTask("nonexistent", "user-1");

      expect(result).toEqual({ success: false, statusCode: 404, error: "Task not found" });
      expect(taskRepo.deleteTask).not.toHaveBeenCalled();
    });

    it("returns 404 when the task is owned by another user", async () => {
      vi.mocked(taskRepo.findTaskOwnership).mockResolvedValue({ createdByUserId: "other-user", minDaysFromArrival: null, maxDaysFromArrival: null } as never);

      const result = await taskService.deleteTask("task-1", "user-1");

      expect(result).toEqual({ success: false, statusCode: 404, error: "Task not found" });
      expect(taskRepo.deleteTask).not.toHaveBeenCalled();
    });
  });
});

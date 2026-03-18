import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserTaskStatus } from "../../generated/prisma/client.js";
import * as taskRepo from "../../repo/taskRepo";
import { prisma } from "../../lib/prisma";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    userTask: {
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("taskRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findUserTasksWithTask", () => {
    it("queries user tasks with task relation for the given user", async () => {
      vi.mocked(prisma.userTask.findMany).mockResolvedValue([]);
      await taskRepo.findUserTasksWithTask("user-1");
      expect(prisma.userTask.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        include: { task: true },
        orderBy: [{ task: { category: "asc" } }, { task: { sortOrder: "asc" } }],
      });
    });
  });

  describe("findTaskById", () => {
    it("queries a task by id", async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(null);
      await taskRepo.findTaskById("task-1");
      expect(prisma.task.findUnique).toHaveBeenCalledWith({ where: { id: "task-1" } });
    });
  });

  describe("findOwnedOrSystemTask", () => {
    it("queries for a task that is system-owned or owned by the given user", async () => {
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);
      await taskRepo.findOwnedOrSystemTask("task-1", "user-1");
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: "task-1",
          OR: [
            { createdByUserId: null },
            { createdByUserId: "user-1" },
          ],
        },
        select: { id: true },
      });
    });
  });

  describe("createTask", () => {
    it("creates a task with the provided data", async () => {
      const data = {
        slug: "test-task",
        title: "Test Task",
        shortDescription: "Description",
        body: "Body",
        category: "OTHER" as const,
        sortOrder: 1,
        officialLinks: {},
      };
      vi.mocked(prisma.task.create).mockResolvedValue({ id: "new-task" } as never);
      await taskRepo.createTask(data);
      expect(prisma.task.create).toHaveBeenCalledWith({ data });
    });
  });

  describe("createUserTaskAssignment", () => {
    it("creates a TODO assignment for the given user and task", async () => {
      vi.mocked(prisma.userTask.create).mockResolvedValue({} as never);
      await taskRepo.createUserTaskAssignment("user-1", "task-1");
      expect(prisma.userTask.create).toHaveBeenCalledWith({
        data: { userId: "user-1", taskId: "task-1", status: UserTaskStatus.TODO },
      });
    });
  });

  describe("upsertUserTaskStatus", () => {
    it("upserts with DONE status and sets completedAt", async () => {
      vi.mocked(prisma.userTask.upsert).mockResolvedValue({} as never);
      const completedAt = new Date();
      await taskRepo.upsertUserTaskStatus("user-1", "task-1", {
        status: UserTaskStatus.DONE,
        completedAt,
      });
      const call = vi.mocked(prisma.userTask.upsert).mock.calls[0][0];
      expect(call.where).toEqual({ userId_taskId: { userId: "user-1", taskId: "task-1" } });
      expect(call.update.status).toBe(UserTaskStatus.DONE);
      expect(call.update.completedAt).toBe(completedAt);
      expect(call.create.status).toBe(UserTaskStatus.DONE);
      expect(call.create.userId).toBe("user-1");
      expect(call.create.taskId).toBe("task-1");
    });

    it("includes personalNotes in both update and create when provided", async () => {
      vi.mocked(prisma.userTask.upsert).mockResolvedValue({} as never);
      await taskRepo.upsertUserTaskStatus("user-1", "task-1", {
        status: UserTaskStatus.TODO,
        completedAt: null,
        personalNotes: "My notes",
      });
      const call = vi.mocked(prisma.userTask.upsert).mock.calls[0][0];
      expect(call.update.personalNotes).toBe("My notes");
      expect(call.create.personalNotes).toBe("My notes");
    });

    it("omits personalNotes from update when not provided", async () => {
      vi.mocked(prisma.userTask.upsert).mockResolvedValue({} as never);
      await taskRepo.upsertUserTaskStatus("user-1", "task-1", {
        status: UserTaskStatus.TODO,
        completedAt: null,
      });
      const call = vi.mocked(prisma.userTask.upsert).mock.calls[0][0];
      expect(call.update).not.toHaveProperty("personalNotes");
    });

    it("includes dueDate in both update and create when provided", async () => {
      vi.mocked(prisma.userTask.upsert).mockResolvedValue({} as never);
      const dueDate = new Date("2026-03-15");
      await taskRepo.upsertUserTaskStatus("user-1", "task-1", {
        status: UserTaskStatus.TODO,
        completedAt: null,
        dueDate,
      });
      const call = vi.mocked(prisma.userTask.upsert).mock.calls[0][0];
      expect(call.update.dueDate).toBe(dueDate);
      expect(call.create.dueDate).toBe(dueDate);
    });

    it("omits dueDate from update when not provided", async () => {
      vi.mocked(prisma.userTask.upsert).mockResolvedValue({} as never);
      await taskRepo.upsertUserTaskStatus("user-1", "task-1", {
        status: UserTaskStatus.TODO,
        completedAt: null,
      });
      const call = vi.mocked(prisma.userTask.upsert).mock.calls[0][0];
      expect(call.update).not.toHaveProperty("dueDate");
    });
  });

  describe("findOnboardingPreviewTasks", () => {
    it("queries tasks with the provided where clause and a minimal select", async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);
      const where = { AND: [{ createdByUserId: null }] };
      await taskRepo.findOnboardingPreviewTasks(where);
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          title: true,
          shortDescription: true,
          category: true,
          sortOrder: true,
        },
      });
    });
  });

  describe("findTaskOwnership", () => {
    it("queries a task by id selecting only id and createdByUserId", async () => {
      const mockTask = { id: "task-1", createdByUserId: "user-1" };
      vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never);

      const result = await taskRepo.findTaskOwnership("task-1");

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: "task-1" },
        select: { id: true, createdByUserId: true },
      });
      expect(result).toEqual(mockTask);
    });

    it("returns null when the task does not exist", async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

      const result = await taskRepo.findTaskOwnership("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("deleteTask", () => {
    it("deletes a task by id", async () => {
      const mockTask = { id: "task-1" };
      vi.mocked(prisma.task.delete).mockResolvedValue(mockTask as never);

      const result = await taskRepo.deleteTask("task-1");

      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: "task-1" } });
      expect(result).toEqual(mockTask);
    });
  });
});

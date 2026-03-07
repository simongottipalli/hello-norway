import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncUserTaskAssignments } from "../services/taskAssignmentService";
import { prisma } from "../lib/prisma";

vi.mock("../lib/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
    },
    userTask: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("taskAssignmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("assigns tasks ignoring arrival window when arrival date is unknown", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: "task-a" }]);
    vi.mocked(prisma.userTask.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userTask.createMany).mockResolvedValue({ count: 1 });

    await syncUserTaskAssignments({
      id: "user-1",
      isEU: null,
      hasChildren: null,
      employmentStatus: null,
      arrivalDate: null,
      plannedArrivalDate: null,
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { requiresEU: null },
          { requiresChildren: null },
          { requiresEmploymentStatus: { isEmpty: true } },
        ],
      },
      select: { id: true },
    });
    expect(prisma.userTask.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", taskId: "task-a", status: "TODO" }],
      skipDuplicates: true,
    });
  });

  it("updates assignments on profile change using arrival window and removes stale TODO tasks", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: "task-keep" }, { id: "task-new" }]);
    vi.mocked(prisma.userTask.findMany).mockResolvedValue([
      { taskId: "task-keep", status: "DONE" },
      { taskId: "task-stale", status: "TODO" },
    ]);
    vi.mocked(prisma.userTask.createMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.userTask.deleteMany).mockResolvedValue({ count: 1 });

    await syncUserTaskAssignments(
      {
        id: "user-1",
        isEU: true,
        hasChildren: true,
        employmentStatus: "EMPLOYED",
        arrivalDate: new Date("2026-03-01T00:00:00Z"),
        plannedArrivalDate: null,
      },
      { removeOutdatedTodoAssignments: true }
    );

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ requiresEU: null }, { requiresEU: true }] },
          { OR: [{ requiresChildren: null }, { requiresChildren: true }] },
          { OR: [{ requiresEmploymentStatus: { isEmpty: true } }, { requiresEmploymentStatus: { has: "EMPLOYED" } }] },
          { OR: [{ minDaysFromArrival: null }, { minDaysFromArrival: { lte: 4 } }] },
          { OR: [{ maxDaysFromArrival: null }, { maxDaysFromArrival: { gte: 4 } }] },
        ],
      },
      select: { id: true },
    });
    expect(prisma.userTask.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", taskId: "task-new", status: "TODO" }],
      skipDuplicates: true,
    });
    expect(prisma.userTask.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        taskId: { in: ["task-stale"] },
        status: "TODO",
      },
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/prisma";

describe("UserTask Model with New Fields", () => {
  let testUserId: string;
  let testTaskId: string;
  let testUserTaskId: string;

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-usertask-${Date.now()}@example.com`,
      },
    });
    testUserId = user.id;

    // Create a test task
    const task = await prisma.task.create({
      data: {
        slug: `test-task-${Date.now()}`,
        title: "Test Task for UserTask",
        shortDescription: "Test description",
        body: "Test body",
        category: "OTHER",
        sortOrder: 9999,
        officialLinks: {},
      },
    });
    testTaskId = task.id;
  });

  afterAll(async () => {
    // Clean up
    if (testUserTaskId) {
      await prisma.userTask.delete({ where: { id: testUserTaskId } }).catch(() => {});
    }
    if (testTaskId) {
      await prisma.task.delete({ where: { id: testTaskId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe("dueDate and personalNotes fields", () => {
    it("should create a UserTask with dueDate and personalNotes", async () => {
      const dueDate = new Date("2026-03-15");
      const personalNotes = "This is a personal note for the task";

      const userTask = await prisma.userTask.create({
        data: {
          userId: testUserId,
          taskId: testTaskId,
          status: "TODO",
          dueDate,
          personalNotes,
        },
      });

      testUserTaskId = userTask.id;

      expect(userTask.dueDate).toBeInstanceOf(Date);
      expect(userTask.dueDate?.toISOString().split("T")[0]).toBe("2026-03-15");
      expect(userTask.personalNotes).toBe(personalNotes);
    });

    it("should create a UserTask without dueDate and personalNotes (optional fields)", async () => {
      // Clean up previous test data
      if (testUserTaskId) {
        await prisma.userTask.delete({ where: { id: testUserTaskId } });
      }

      const userTask = await prisma.userTask.create({
        data: {
          userId: testUserId,
          taskId: testTaskId,
          status: "TODO",
        },
      });

      testUserTaskId = userTask.id;

      expect(userTask.dueDate).toBeNull();
      expect(userTask.personalNotes).toBeNull();
    });

    it("should update dueDate and personalNotes on existing UserTask", async () => {
      const newDueDate = new Date("2026-04-20");
      const newPersonalNotes = "Updated personal notes";

      const updatedUserTask = await prisma.userTask.update({
        where: { id: testUserTaskId },
        data: {
          dueDate: newDueDate,
          personalNotes: newPersonalNotes,
        },
      });

      expect(updatedUserTask.dueDate).toBeInstanceOf(Date);
      expect(updatedUserTask.dueDate?.toISOString().split("T")[0]).toBe("2026-04-20");
      expect(updatedUserTask.personalNotes).toBe(newPersonalNotes);
    });

    it("should allow setting dueDate and personalNotes to null", async () => {
      const updatedUserTask = await prisma.userTask.update({
        where: { id: testUserTaskId },
        data: {
          dueDate: null,
          personalNotes: null,
        },
      });

      expect(updatedUserTask.dueDate).toBeNull();
      expect(updatedUserTask.personalNotes).toBeNull();
    });
  });
});

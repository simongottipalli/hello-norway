import { describe, it, expect, afterAll, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

let authUserId: string;
let authUserEmail: string;

const generateUniqueTestEmail = () =>
  `test+${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

vi.mock("../middleware/authMiddleware", () => ({
  authenticateSession: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: authUserId, email: authUserEmail, name: "Test User" };
    req.session = { id: "test-session-id", token: "test-token", expiresAt: new Date(Date.now() + 60_000) };
    next();
  },
}));

const app = createApp();

describe("Task API", () => {
  let createdTaskId: string;

  beforeEach(() => {
    authUserId = randomUUID();
    authUserEmail = generateUniqueTestEmail();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });
  });

  describe("GET /api/tasks", () => {
    let getTestTaskId: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          slug: `get-test-task-${Date.now()}`,
          title: "Get Test Task",
          shortDescription: "Task for GET tests",
          body: "Body",
          category: "OTHER",
          sortOrder: 9999,
          officialLinks: {},
        },
      });
      getTestTaskId = task.id;
    });

    afterAll(async () => {
      if (getTestTaskId) {
        await prisma.task.delete({ where: { id: getTestTaskId } }).catch(() => {});
      }
    });

    it("should return all tasks", async () => {
      const response = await request(app).get("/api/tasks");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should return tasks with correct structure", async () => {
      const response = await request(app).get("/api/tasks");

      const task = response.body[0];
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("slug");
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("shortDescription");
      expect(task).toHaveProperty("body");
      expect(task).toHaveProperty("category");
      expect(task).toHaveProperty("sortOrder");
    });

    it("should return tasks ordered by category and sortOrder", async () => {
      const response = await request(app).get("/api/tasks");

      const tasks = response.body;
      for (let i = 1; i < tasks.length; i++) {
        const prev = tasks[i - 1];
        const curr = tasks[i];

        if (prev.category === curr.category) {
          expect(prev.sortOrder).toBeLessThanOrEqual(curr.sortOrder);
        }
      }
    });

    it("should return all tasks including unassigned tasks", async () => {
      await prisma.user.upsert({
        where: { id: authUserId },
        update: {},
        create: {
          id: authUserId,
          email: authUserEmail,
          name: "Test User",
        },
      });

      let assignedTaskId = "";
      let unassignedTaskId = "";

      try {
        const assignedTask = await prisma.task.create({
          data: {
            slug: `assigned-task-${Date.now()}`,
            title: "Assigned Task",
            shortDescription: "Assigned task description",
            body: "Assigned task body",
            category: "OTHER",
            sortOrder: 5001,
            officialLinks: {},
          },
        });
        assignedTaskId = assignedTask.id;

        const unassignedTask = await prisma.task.create({
          data: {
            slug: `unassigned-task-${Date.now()}`,
            title: "Unassigned Task",
            shortDescription: "Unassigned task description",
            body: "Unassigned task body",
            category: "OTHER",
            sortOrder: 5002,
            officialLinks: {},
          },
        });
        unassignedTaskId = unassignedTask.id;

        await prisma.userTask.create({
          data: {
            userId: authUserId,
            taskId: assignedTask.id,
            status: "TODO",
          },
        });

        const response = await request(app).get("/api/tasks");
        const taskIds = response.body.map((task: { id: string }) => task.id);

        expect(response.status).toBe(200);
        expect(taskIds).toContain(assignedTask.id);
        expect(taskIds).toContain(unassignedTask.id);
      } finally {
        if (assignedTaskId) {
          await prisma.userTask.deleteMany({ where: { userId: authUserId, taskId: assignedTaskId } });
        }
        await prisma.task.deleteMany({ where: { id: { in: [assignedTaskId, unassignedTaskId].filter(Boolean) } } });
        await prisma.user.deleteMany({ where: { id: authUserId } });
      }
    });
  });

  describe("GET /api/user-tasks", () => {
    it("should return only assigned user tasks for the authenticated user", async () => {
      await prisma.user.upsert({
        where: { id: authUserId },
        update: {},
        create: {
          id: authUserId,
          email: authUserEmail,
          name: "Test User",
        },
      });

      let assignedTaskId = "";
      let unassignedTaskId = "";

      try {
        const assignedTask = await prisma.task.create({
          data: {
            slug: `assigned-user-task-${Date.now()}`,
            title: "Assigned User Task",
            shortDescription: "Assigned user task description",
            body: "Assigned user task body",
            category: "OTHER",
            sortOrder: 5003,
            officialLinks: {},
          },
        });
        assignedTaskId = assignedTask.id;

        const unassignedTask = await prisma.task.create({
          data: {
            slug: `unassigned-user-task-${Date.now()}`,
            title: "Unassigned User Task",
            shortDescription: "Unassigned user task description",
            body: "Unassigned user task body",
            category: "OTHER",
            sortOrder: 5004,
            officialLinks: {},
          },
        });
        unassignedTaskId = unassignedTask.id;

        await prisma.userTask.create({
          data: {
            userId: authUserId,
            taskId: assignedTask.id,
            status: "TODO",
          },
        });

        const response = await request(app).get("/api/user-tasks");
        const taskIds = response.body.map((task: { id: string }) => task.id);
        const assignedResponseTask = response.body.find((task: { id: string }) => task.id === assignedTask.id);

        expect(response.status).toBe(200);
        expect(taskIds).toContain(assignedTask.id);
        expect(taskIds).not.toContain(unassignedTask.id);
        expect(assignedResponseTask).toMatchObject({
          userTaskId: expect.any(String),
          status: "TODO",
          dueDate: null,
          personalNotes: null,
          completedAt: null,
        });
      } finally {
        if (assignedTaskId) {
          await prisma.userTask.deleteMany({ where: { userId: authUserId, taskId: assignedTaskId } });
        }
        await prisma.task.deleteMany({ where: { id: { in: [assignedTaskId, unassignedTaskId].filter(Boolean) } } });
        await prisma.user.deleteMany({ where: { id: authUserId } });
      }
    });
  });

  describe("POST /api/tasks", () => {
    it("should create a new task with all fields", async () => {
      const newTask = {
        slug: `test-task-${Date.now()}`,
        title: "Test Task",
        shortDescription: "This is a test task",
        body: "This is the body of the test task",
        category: "OTHER",
        sortOrder: 9999,
        officialLinks: { test: "https://example.com" },
        requiresEU: true,
        minDaysFromArrival: 0,
        maxDaysFromArrival: 30,
      };

      const response = await request(app)
        .post("/api/tasks")
        .send(newTask)
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.slug).toBe(newTask.slug);
      expect(response.body.title).toBe(newTask.title);
      expect(response.body.requiresEU).toBe(true);

      createdTaskId = response.body.id;
    });

    it("should create a task with only required fields", async () => {
      const newTask = {
        slug: `minimal-task-${Date.now()}`,
        title: "Minimal Task",
        shortDescription: "Minimal description",
        body: "Minimal body",
        category: "OTHER",
        sortOrder: 9998,
      };

      const response = await request(app)
        .post("/api/tasks")
        .send(newTask)
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
      expect(response.body.slug).toBe(newTask.slug);
      expect(response.body.officialLinks).toEqual({});

      // Clean up
      await prisma.task.delete({ where: { id: response.body.id } });
    });

    it("should return 400 when missing required fields", async () => {
      const incompleteTask = {
        slug: "incomplete-task",
      };

      const response = await request(app)
        .post("/api/tasks")
        .send(incompleteTask)
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Missing required fields");
    });

    it("should return 400 when slug already exists", async () => {
      const existingTask = await prisma.task.findFirst();

      const duplicateTask = {
        slug: existingTask!.slug,
        title: "Duplicate Test",
        shortDescription: "Testing duplicate",
        body: "This should fail",
        category: "OTHER",
        sortOrder: 1,
      };

      const response = await request(app)
        .post("/api/tasks")
        .send(duplicateTask)
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("already exists");
    });
  });

  describe("PATCH /api/tasks/:id", () => {
    it("should update a task", async () => {
      const updates = {
        title: "Updated Test Task",
        shortDescription: "This task has been updated",
        sortOrder: 8888,
      };

      const response = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .send(updates)
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdTaskId);
      expect(response.body.title).toBe(updates.title);
      expect(response.body.shortDescription).toBe(updates.shortDescription);
      expect(response.body.sortOrder).toBe(updates.sortOrder);
    });

    it("should return 404 when task not found", async () => {
      const response = await request(app)
        .patch("/api/tasks/00000000-0000-0000-0000-000000000000")
        .send({ title: "Updated" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });

    it("should return 400 when updating to duplicate slug", async () => {
      const secondTask = await prisma.task.create({
        data: {
          slug: `duplicate-slug-source-${Date.now()}`,
          title: "Second Task",
          shortDescription: "Source for duplicate slug test",
          body: "Body",
          category: "OTHER",
          sortOrder: 9997,
          officialLinks: {},
        },
      });

      try {
        const response = await request(app)
          .patch(`/api/tasks/${createdTaskId}`)
          .send({ slug: secondTask.slug })
          .set("Content-Type", "application/json");

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("already exists");
      } finally {
        await prisma.task.delete({ where: { id: secondTask.id } }).catch(() => {});
      }
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete a task", async () => {
      const response = await request(app).delete(`/api/tasks/${createdTaskId}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      const deletedTask = await prisma.task.findUnique({
        where: { id: createdTaskId },
      });
      expect(deletedTask).toBeNull();
    });

    it("should return 404 when task not found", async () => {
      const response = await request(app).delete(
        "/api/tasks/00000000-0000-0000-0000-000000000000"
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  });
});

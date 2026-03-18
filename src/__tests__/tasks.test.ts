import { describe, it, expect, afterAll, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

let authUserId: string;
let authUserEmail: string;
let taskCreatorUserId: string;
let taskCreatorEmail: string;

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
  beforeAll(async () => {
    taskCreatorUserId = randomUUID();
    taskCreatorEmail = generateUniqueTestEmail();
    await prisma.user.create({
      data: { id: taskCreatorUserId, email: taskCreatorEmail, name: "Task Creator" },
    });
  });

  beforeEach(() => {
    authUserId = randomUUID();
    authUserEmail = generateUniqueTestEmail();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: taskCreatorUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });
  });

  describe("GET /api/tasks/personalized", () => {
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

        const response = await request(app).get("/api/tasks/personalized");
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
    beforeEach(() => {
      // All POST tests run as the designated task creator user
      authUserId = taskCreatorUserId;
      authUserEmail = taskCreatorEmail;
    });

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
      expect(response.body.createdByUserId).toBe(taskCreatorUserId);
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
      expect(response.body.createdByUserId).toBe(taskCreatorUserId);

      // Clean up (cascades to UserTask)
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
      const existingTask = await prisma.task.findFirst({ where: { createdByUserId: null } });

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

    it("should return 400 when category is not a valid enum value", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({
          slug: `invalid-category-${Date.now()}`,
          title: "Category Test",
          shortDescription: "Short desc",
          body: "Body",
          category: "INVALID_CATEGORY",
          sortOrder: 1,
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid category");
    });

    it("should return 400 when sortOrder is not an integer", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({
          slug: `float-sortorder-${Date.now()}`,
          title: "Float sortOrder",
          shortDescription: "Short desc",
          body: "Body",
          category: "OTHER",
          sortOrder: 1.5,
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("sortOrder");
    });

    it("should return 400 when sortOrder exceeds SmallInt max", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({
          slug: `huge-sortorder-${Date.now()}`,
          title: "Huge sortOrder",
          shortDescription: "Short desc",
          body: "Body",
          category: "OTHER",
          sortOrder: 99999,
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("sortOrder");
    });

    it("should return 400 when requiresEU is not a boolean", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({
          slug: `invalid-eu-${Date.now()}`,
          title: "EU Test",
          shortDescription: "Short desc",
          body: "Body",
          category: "OTHER",
          sortOrder: 1,
          requiresEU: "yes",
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("requiresEU");
    });

    it("should allow negative minDaysFromArrival values", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({
          slug: `neg-min-days-${Date.now()}`,
          title: "Negative days",
          shortDescription: "Short desc",
          body: "Body",
          category: "OTHER",
          sortOrder: 1,
          minDaysFromArrival: -1,
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
    });

    it("should return 400 when maxDaysFromArrival is less than minDaysFromArrival", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({
          slug: `invalid-days-range-${Date.now()}`,
          title: "Invalid days range",
          shortDescription: "Short desc",
          body: "Body",
          category: "OTHER",
          sortOrder: 1,
          minDaysFromArrival: 10,
          maxDaysFromArrival: 5,
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("maxDaysFromArrival");
    });
  });

  describe("User-created task isolation", () => {
    let ownerUserId: string;
    let ownerUserEmail: string;
    let isolationTaskId: string;

    beforeAll(async () => {
      ownerUserId = randomUUID();
      ownerUserEmail = generateUniqueTestEmail();
      await prisma.user.create({
        data: { id: ownerUserId, email: ownerUserEmail, name: "Owner User" },
      });

      // Create the task as ownerUser
      authUserId = ownerUserId;
      authUserEmail = ownerUserEmail;
      const response = await request(app)
        .post("/api/tasks")
        .send({
          slug: `isolation-task-${Date.now()}`,
          title: "Owner Task",
          shortDescription: "Only visible to owner",
          body: "Private task body",
          category: "OTHER",
          sortOrder: 7777,
        })
        .set("Content-Type", "application/json");

      isolationTaskId = response.body.id;
    });

    afterAll(async () => {
      // Cascade-deletes the task and its UserTask
      await prisma.user.deleteMany({ where: { id: ownerUserId } }).catch(() => {});
    });

    beforeEach(() => {
      // Default: a different, unrelated user
      authUserId = randomUUID();
      authUserEmail = generateUniqueTestEmail();
    });

    it("should appear in GET /api/tasks/personalized for the owner", async () => {
      authUserId = ownerUserId;
      authUserEmail = ownerUserEmail;
      const response = await request(app).get("/api/tasks/personalized");
      expect(response.status).toBe(200);
      const ids = response.body.map((t: { id: string }) => t.id);
      expect(ids).toContain(isolationTaskId);
    });

    it("should not appear in GET /api/tasks/personalized for another user", async () => {
      // authUserId is a random user (set by beforeEach) — they should not see the owner's task
      const response = await request(app).get("/api/tasks/personalized");
      expect(response.status).toBe(200);
      const ids = response.body.map((t: { id: string }) => t.id);
      expect(ids).not.toContain(isolationTaskId);
    });

    it("should return 404 on GET /api/tasks/:id for another user", async () => {
      const response = await request(app).get(`/api/tasks/${isolationTaskId}`);
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });

    it("should return 404 on PATCH /api/tasks/:id/status for another user", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${isolationTaskId}/status`)
        .send({ status: "in_progress" });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });

    it("should allow the owner to view their task via GET /api/tasks/:id", async () => {
      authUserId = ownerUserId;
      authUserEmail = ownerUserEmail;
      const response = await request(app).get(`/api/tasks/${isolationTaskId}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(isolationTaskId);
      expect(response.body.createdByUserId).toBe(ownerUserId);
    });

    it("should allow the owner to update task status via PATCH /api/tasks/:id/status", async () => {
      authUserId = ownerUserId;
      authUserEmail = ownerUserEmail;
      const response = await request(app)
        .patch(`/api/tasks/${isolationTaskId}/status`)
        .send({ status: "in_progress" });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("SAVED");
    });
  });
});

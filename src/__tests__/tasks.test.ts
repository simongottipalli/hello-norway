import { describe, it, expect, afterAll, vi } from "vitest";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

vi.mock("../middleware/authMiddleware", () => ({
  authenticateSession: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: "test-user-id", email: "test@example.com", name: "Test User" };
    req.session = { id: "test-session-id", token: "test-token", expiresAt: new Date(Date.now() + 60_000) };
    next();
  },
}));

const app = createApp();

describe("Task API", () => {
  let createdTaskId: string;

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
      const existingTask = await prisma.task.findFirst({
        where: { id: { not: createdTaskId } },
      });

      const response = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .send({ slug: existingTask!.slug })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("already exists");
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import authRoutes from "../routes/authRoutes";
import { prisma } from "../lib/prisma";
import { getRelevantTaskWhere, syncUserTaskAssignments } from "../services/taskAssignmentService";

vi.mock("../middleware/authMiddleware", () => ({
  authenticateSession: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: "user-1", email: "user@example.com", name: "User" };
    next();
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    userTask: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("../services/taskAssignmentService", () => ({
  getRelevantTaskWhere: vi.fn(),
  syncUserTaskAssignments: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api", authRoutes);

describe("/api/auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => {
      return callback(prisma as unknown as typeof prisma);
    });
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      isEU: true,
      hasChildren: false,
      employmentStatus: "EMPLOYED",
      arrivalDate: new Date("2026-03-01T00:00:00.000Z"),
      plannedArrivalDate: null,
    });
    vi.mocked(getRelevantTaskWhere).mockReturnValue({ mockedWhere: true });
  });

  describe("GET /api/auth/profile", () => {
    it("returns the current user profile", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED",
        arrivalDate: new Date("2026-03-01T00:00:00.000Z"),
        plannedArrivalDate: null,
      });

      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        hasChildren: false,
        employmentStatus: "EMPLOYED",
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: {
          id: true,
          email: true,
          name: true,
          isEU: true,
          hasChildren: true,
          employmentStatus: true,
          arrivalDate: true,
          plannedArrivalDate: true,
        },
      });
    });
  });

  describe("PATCH /api/auth/profile", () => {
    it("updates profile and re-syncs relevant task assignments", async () => {
      const response = await request(app)
        .patch("/api/auth/profile")
        .send({
          name: "Updated User",
          isEU: true,
          hasChildren: false,
          employmentStatus: "EMPLOYED",
          arrivalDate: "2026-03-01",
        })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          name: "Updated User",
          isEU: true,
          hasChildren: false,
          employmentStatus: "EMPLOYED",
          arrivalDate: new Date("2026-03-01T00:00:00.000Z"),
        },
        select: {
          id: true,
          email: true,
          name: true,
          isEU: true,
          hasChildren: true,
          employmentStatus: true,
          arrivalDate: true,
          plannedArrivalDate: true,
        },
      });
      expect(syncUserTaskAssignments).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-1", employmentStatus: "EMPLOYED" }),
        expect.objectContaining({ removeOutdatedTodoAssignments: true, db: expect.any(Object) })
      );
    });

    it("returns 400 for an empty name", async () => {
      const response = await request(app)
        .patch("/api/auth/profile")
        .send({ name: "   " })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid name");
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid arrival date", async () => {
      const response = await request(app)
        .patch("/api/auth/profile")
        .send({ arrivalDate: "2026-02-30" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid arrivalDate");
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(syncUserTaskAssignments).not.toHaveBeenCalled();
    });

    it("returns 500 when sync fails inside transaction", async () => {
      vi.mocked(syncUserTaskAssignments).mockRejectedValueOnce(new Error("sync failed"));

      const response = await request(app)
        .patch("/api/auth/profile")
        .send({ hasChildren: true })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to update profile");
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("DELETE /api/auth/profile", () => {
    beforeEach(() => {
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.userTask.deleteMany).mockResolvedValue({ count: 5 });
      vi.mocked(prisma.user.delete).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED",
        housingType: null,
        plannedArrivalDate: null,
        arrivalDate: new Date("2026-03-01T00:00:00.000Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("successfully deletes user profile and all associated data", async () => {
      const response = await request(app).delete("/api/auth/profile");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(prisma.userTask.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("returns 500 when deletion fails", async () => {
      vi.mocked(prisma.user.delete).mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).delete("/api/auth/profile");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to delete profile");
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});

describe("POST /api/onboarding/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRelevantTaskWhere).mockReturnValue({ mockedWhere: true });
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
  });

  it("returns 400 for invalid boolean and enum fields", async () => {
    const invalidIsEU = await request(app)
      .post("/api/onboarding/tasks")
      .send({ isEU: "yes" })
      .set("Content-Type", "application/json");
    expect(invalidIsEU.status).toBe(400);
    expect(invalidIsEU.body.error).toContain("Invalid isEU");

    const invalidChildren = await request(app)
      .post("/api/onboarding/tasks")
      .send({ hasChildren: "no" })
      .set("Content-Type", "application/json");
    expect(invalidChildren.status).toBe(400);
    expect(invalidChildren.body.error).toContain("Invalid hasChildren");

    const invalidEmployment = await request(app)
      .post("/api/onboarding/tasks")
      .send({ employmentStatus: "CONTRACTOR" })
      .set("Content-Type", "application/json");
    expect(invalidEmployment.status).toBe(400);
    expect(invalidEmployment.body.error).toContain("Invalid employmentStatus");

    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid date payloads", async () => {
    const invalidArrivalDate = await request(app)
      .post("/api/onboarding/tasks")
      .send({ arrivalDate: "2026-02-30" })
      .set("Content-Type", "application/json");
    expect(invalidArrivalDate.status).toBe(400);
    expect(invalidArrivalDate.body.error).toContain("Invalid arrivalDate");

    const invalidPlannedDate = await request(app)
      .post("/api/onboarding/tasks")
      .send({ plannedArrivalDate: "not-a-date" })
      .set("Content-Type", "application/json");
    expect(invalidPlannedDate.status).toBe(400);
    expect(invalidPlannedDate.body.error).toContain("Invalid plannedArrivalDate");

    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it("queries prisma with expected shape and returns minimal task data", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValueOnce([
      {
        id: "task-1",
        title: "Register with police",
        shortDescription: "Complete police registration",
        category: "ARRIVAL",
        sortOrder: 20,
      },
    ]);

    const response = await request(app)
      .post("/api/onboarding/tasks")
      .send({
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED",
        arrivalDate: "2026-03-01",
        plannedArrivalDate: "2026-02-25",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: "task-1",
        title: "Register with police",
        shortDescription: "Complete police registration",
        category: "ARRIVAL",
        sortOrder: 20,
      },
    ]);

    expect(getRelevantTaskWhere).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "onboarding-preview",
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED",
        arrivalDate: new Date("2026-03-01T00:00:00.000Z"),
        plannedArrivalDate: new Date("2026-02-25T00:00:00.000Z"),
      }),
      expect.any(Date),
    );

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { mockedWhere: true },
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

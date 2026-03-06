import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import authRoutes from "../routes/authRoutes";
import { prisma } from "../lib/prisma";
import { syncUserTaskAssignments } from "../services/taskAssignmentService";

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
    },
    session: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("../services/taskAssignmentService", () => ({
  syncUserTaskAssignments: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api", authRoutes);

describe("PATCH /api/auth/profile", () => {
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
  });

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

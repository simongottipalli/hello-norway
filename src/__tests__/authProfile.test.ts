import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import authRoutes from "../routes/authRoutes";
import { withTransaction } from "../repo/db";
import * as userRepo from "../repo/userRepo";
import * as sessionRepo from "../repo/sessionRepo";
import { getRelevantTaskWhere } from "../repo/taskAssignmentRepo";
import { syncUserTaskAssignments } from "../services/taskAssignmentService";

vi.mock("../middleware/authMiddleware", () => ({
  authenticateSession: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: "user-1", email: "user@example.com", name: "User" };
    next();
  },
}));

vi.mock("../repo/userRepo", () => ({
  findUserById: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUserTasks: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("../repo/sessionRepo", () => ({
  findSessionWithUser: vi.fn(),
  deleteSessionById: vi.fn(),
  deleteSessionByToken: vi.fn(),
  deleteUserSessions: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock("../repo/taskRepo", () => ({
  findOnboardingPreviewTasks: vi.fn(),
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

vi.mock("../repo/db", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("../repo/taskAssignmentRepo", () => ({
  getRelevantTaskWhere: vi.fn(),
}));

vi.mock("../services/taskAssignmentService", () => ({
  syncUserTaskAssignments: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api", authRoutes);

describe("/api/auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(withTransaction).mockImplementation(async (callback) => {
      return callback({} as never);
    });
    vi.mocked(userRepo.updateUserProfile).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      isEU: true,
      hasChildren: false,
      employmentStatus: "EMPLOYED",
      arrivalDate: new Date("2026-03-01T00:00:00.000Z"),
      plannedArrivalDate: null,
    });
    vi.mocked(getRelevantTaskWhere).mockReturnValue({ mockedWhere: true } as never);
  });

  describe("GET /api/auth/profile", () => {
    it("returns the current user profile", async () => {
      vi.mocked(userRepo.findUserById).mockResolvedValue({
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
      expect(userRepo.findUserById).toHaveBeenCalledWith("user-1");
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
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(userRepo.updateUserProfile).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          name: "Updated User",
          isEU: true,
          hasChildren: false,
          employmentStatus: "EMPLOYED",
          arrivalDate: new Date("2026-03-01T00:00:00.000Z"),
        }),
        expect.anything(),
      );
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
      expect(withTransaction).not.toHaveBeenCalled();
      expect(userRepo.updateUserProfile).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid arrival date", async () => {
      const response = await request(app)
        .patch("/api/auth/profile")
        .send({ arrivalDate: "2026-02-30" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid arrivalDate");
      expect(withTransaction).not.toHaveBeenCalled();
      expect(userRepo.updateUserProfile).not.toHaveBeenCalled();
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
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(userRepo.updateUserProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe("DELETE /api/auth/profile", () => {
    beforeEach(() => {
      vi.mocked(sessionRepo.deleteUserSessions).mockResolvedValue({ count: 1 });
      vi.mocked(userRepo.deleteUserTasks).mockResolvedValue({ count: 5 });
      vi.mocked(userRepo.deleteUser).mockResolvedValue({} as never);
    });

    it("successfully deletes user profile and all associated data", async () => {
      const response = await request(app).delete("/api/auth/profile");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(sessionRepo.deleteUserSessions).toHaveBeenCalledWith("user-1", expect.anything());
      expect(userRepo.deleteUserTasks).toHaveBeenCalledWith("user-1", expect.anything());
      expect(userRepo.deleteUser).toHaveBeenCalledWith("user-1", expect.anything());
    });

    it("returns 500 when deletion fails", async () => {
      vi.mocked(userRepo.deleteUser).mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).delete("/api/auth/profile");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to delete profile");
      expect(withTransaction).toHaveBeenCalledTimes(1);
    });
  });
});


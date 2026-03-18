import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import * as sessionRepo from "../repo/sessionRepo";
import * as taskRepo from "../repo/taskRepo";

/**
 * Routing auth policy tests
 *
 * These tests use the real createApp() with NO auth mock so they act as a
 * contract for which routes are public and which require a session cookie.
 * If the routing in app.ts ever regresses, these will catch it.
 */

// Stub sessionRepo so authenticateSession doesn't need a real DB connection.
// Returning null from findSessionWithUser simulates "session not found → 401".
vi.mock("../repo/sessionRepo", () => ({
  findSessionWithUser: vi.fn().mockResolvedValue(null),
  deleteSessionById: vi.fn(),
  deleteSessionByToken: vi.fn().mockResolvedValue({ count: 0 }),
  deleteUserSessions: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock("../repo/taskRepo", () => ({
  findOnboardingPreviewTasks: vi.fn().mockResolvedValue([]),
  findUserTasksWithTask: vi.fn(),
  findTaskById: vi.fn(),
  findOwnedOrSystemTask: vi.fn(),
  createTask: vi.fn(),
  createUserTaskAssignment: vi.fn(),
  upsertUserTaskStatus: vi.fn(),
}));

// Stub otpService so public-route tests don't trigger real email/DB calls.
// Both methods return success so the response status comes from business logic,
// not from the auth middleware (which would return { error: "Unauthorized" }).
vi.mock("../services/otpService", () => ({
  otpService: {
    requestOtp: vi.fn().mockResolvedValue({ success: true }),
    verifyOtp: vi.fn().mockResolvedValue({
      success: true,
      sessionToken: "mock-session-token",
      user: { id: "user-1", email: "test@example.com", name: "Test User" },
    }),
  },
}));

const app = createApp();

describe("API route auth policy", () => {
  describe("Public routes — reachable without a session cookie", () => {
    it("POST /api/otp/generate is NOT blocked with 401", async () => {
      const response = await request(app)
        .post("/api/otp/generate")
        .send({ email: "test@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).not.toBe(401);
    });

    it("POST /api/otp/verify is NOT blocked with 401", async () => {
      const response = await request(app)
        .post("/api/otp/verify")
        .send({ email: "test@example.com", code: 123456 })
        .set("Content-Type", "application/json");

      // 200 = route was reached and service returned success.
      // Any auth-middleware block would return { error: "Unauthorized" } instead.
      expect(response.status).toBe(200);
      expect(response.body.error).not.toBe("Unauthorized");
    });

    it("POST /api/auth/logout is NOT blocked with 401", async () => {
      const response = await request(app).post("/api/auth/logout");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.error).not.toBe("Unauthorized");
    });

    it("POST /api/auth/logout deletes the current session token when provided", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", ["session_token=test-token"]);

      expect(response.status).toBe(200);
      expect(vi.mocked(sessionRepo.deleteSessionByToken)).toHaveBeenCalledWith("test-token");
    });

    it("POST /api/auth/logout returns 500 when session deletion fails", async () => {
      vi.mocked(sessionRepo.deleteSessionByToken).mockRejectedValueOnce(new Error("db down"));

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", ["session_token=test-token"]);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to logout");
    });

    it("POST /api/onboarding/tasks is NOT blocked with 401", async () => {
      const response = await request(app)
        .post("/api/onboarding/tasks")
        .send({ isEU: false })
        .set("Content-Type", "application/json");

      expect(response.status).not.toBe(401);
    });
  });

  describe("Protected routes — require a valid session cookie", () => {
    it("GET /api/tasks/personalized returns 401 without a session cookie", async () => {
      const response = await request(app).get("/api/tasks/personalized");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("POST /api/tasks returns 401 without a session cookie", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({ slug: "test", title: "Test Task" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("PATCH /api/tasks/:id/status returns 401 without a session cookie", async () => {
      const response = await request(app)
        .patch("/api/tasks/00000000-0000-0000-0000-000000000000/status")
        .send({ status: "DONE" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("PATCH /api/auth/profile returns 401 without a session cookie", async () => {
      const response = await request(app)
        .patch("/api/auth/profile")
        .send({ isEU: true })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("GET /api/auth/profile returns 401 without a session cookie", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("DELETE /api/tasks/:id returns 401 without a session cookie", async () => {
      const response = await request(app).delete("/api/tasks/00000000-0000-0000-0000-000000000000");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });
  });
});

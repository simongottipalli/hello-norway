import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";

/**
 * Routing auth policy tests
 *
 * These tests use the real createApp() with NO auth mock so they act as a
 * contract for which routes are public and which require a session cookie.
 * If the routing in app.ts ever regresses, these will catch it.
 */

// Stub prisma so authenticateSession doesn't need a real DB connection.
// Returning null from findUnique simulates "session not found → 401".
vi.mock("../lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    },
  },
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
  });

  describe("Protected routes — require a valid session cookie", () => {
    it("GET /api/tasks returns 401 without a session cookie", async () => {
      const response = await request(app).get("/api/tasks");

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

    it("PATCH /api/tasks/:id returns 401 without a session cookie", async () => {
      const response = await request(app)
        .patch("/api/tasks/00000000-0000-0000-0000-000000000000")
        .send({ title: "Updated" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("DELETE /api/tasks/:id returns 401 without a session cookie", async () => {
      const response = await request(app).delete(
        "/api/tasks/00000000-0000-0000-0000-000000000000"
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });
  });
});

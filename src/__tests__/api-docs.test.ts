import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";

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

vi.mock("../repo/taskAssignmentRepo", () => ({
  getRelevantTaskWhere: vi.fn().mockReturnValue({}),
}));

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

describe("API docs routes", () => {
  const originalEnv = process.env.API_DOCS_ENABLED;

  afterEach(() => {
    process.env.API_DOCS_ENABLED = originalEnv;
  });

  describe("when API_DOCS_ENABLED=true", () => {
    beforeEach(() => {
      process.env.API_DOCS_ENABLED = "true";
    });

    it("GET /api-docs returns Swagger UI HTML", async () => {
      const app = createApp();
      // swagger-ui-express redirects /api-docs → /api-docs/
      const response = await request(app).get("/api-docs/");
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/text\/html/);
    });

    it("GET /api-docs/swagger.json returns 200 with JSON content", async () => {
      const app = createApp();
      const response = await request(app).get("/api-docs/swagger.json");
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("openapi");
    });
  });

  describe("when API_DOCS_ENABLED is not set", () => {
    beforeEach(() => {
      delete process.env.API_DOCS_ENABLED;
    });

    it("GET /api-docs/ returns 404", async () => {
      const app = createApp();
      const response = await request(app).get("/api-docs/");
      expect(response.status).toBe(404);
    });

    it("GET /api-docs/swagger.json returns 404", async () => {
      const app = createApp();
      const response = await request(app).get("/api-docs/swagger.json");
      expect(response.status).toBe(404);
    });
  });
});

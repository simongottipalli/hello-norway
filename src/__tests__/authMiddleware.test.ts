import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { authenticateSession } from "../middleware/authMiddleware";
import * as sessionRepo from "../repo/sessionRepo";
import { requestLogger } from "../middleware/requestLogger";

vi.mock("../repo/sessionRepo", () => ({
  findSessionWithUser: vi.fn(),
  deleteSessionById: vi.fn(),
  deleteSessionByToken: vi.fn(),
  deleteUserSessions: vi.fn(),
  createSession: vi.fn(),
}));

const createTestApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(requestLogger);
  app.get("/protected", authenticateSession, (req, res) => {
    res.status(200).json({ user: req.user });
  });
  return app;
};

describe("authenticateSession middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session cookie is missing", async () => {
    const app = createTestApp();
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 401 and removes expired sessions", async () => {
    vi.mocked(sessionRepo.findSessionWithUser).mockResolvedValue({
      id: "session-1",
      sessionToken: "token",
      userId: "user-1",
      expiresAt: new Date("2024-01-01T00:00:00.000Z"),
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      user: { id: "user-1", email: "test@example.com", name: "Test User" },
    } as never);
    vi.mocked(sessionRepo.deleteSessionById).mockResolvedValue({} as never);

    const app = createTestApp();
    const response = await request(app)
      .get("/protected")
      .set("Cookie", ["session_token=token"]);

    expect(response.status).toBe(401);
    expect(sessionRepo.deleteSessionById).toHaveBeenCalledWith("session-1");
  });

  it("attaches user to request when session is valid", async () => {
    vi.mocked(sessionRepo.findSessionWithUser).mockResolvedValue({
      id: "session-1",
      sessionToken: "token",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      user: { id: "user-1", email: "test@example.com", name: "Test User" },
    } as never);

    const app = createTestApp();
    const response = await request(app)
      .get("/protected")
      .set("Cookie", ["session_token=token"]);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import type { Request } from "express";
import { createApp } from "../app";

const MOCK_USER = { id: "user-1", email: "user@example.com", name: "Test User" };
const MOCK_SESSION = {
  id: "session-1",
  token: "test-token",
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
};

vi.mock("../middleware/tsoaAuthentication", () => ({
  expressAuthentication: vi.fn().mockImplementation((req: Request) => {
    req.user = MOCK_USER;
    req.session = MOCK_SESSION;
    return Promise.resolve(MOCK_USER);
  }),
}));

const app = createApp();

describe("GET /api/auth/session", () => {
  it("should return 200 with authenticated: true and user/session info when logged in", async () => {
    const response = await request(app).get("/api/auth/session");

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(true);
    expect(response.body.user).toEqual(MOCK_USER);
    expect(response.body.session).toMatchObject({
      expiresAt: MOCK_SESSION.expiresAt.toISOString(),
    });
  });

  it("should return 401 when authentication fails", async () => {
    const { expressAuthentication } = await import(
      "../middleware/tsoaAuthentication"
    );
    vi.mocked(expressAuthentication).mockRejectedValueOnce({
      status: 401,
      message: "Unauthorized",
    });

    const response = await request(app).get("/api/auth/session");

    expect(response.status).toBe(401);
  });
});

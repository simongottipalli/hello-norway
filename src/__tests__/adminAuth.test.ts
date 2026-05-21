import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import type { Request } from "express";
import { createApp } from "../app";
import * as adminRepo from "../repo/adminRepo";

const MOCK_ADMIN_USER = { id: "admin-1", email: "admin@example.com", name: "Admin" };
const MOCK_ADMIN_SESSION = {
  id: "admin-session-1",
  token: "admin-token",
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
};

// Mock tsoa authentication to inject admin user on admin_cookie_auth requests
vi.mock("../middleware/tsoaAuthentication", () => ({
  expressAuthentication: vi.fn().mockImplementation((req: Request, securityName: string) => {
    if (securityName === "admin_cookie_auth") {
      req.adminUser = MOCK_ADMIN_USER;
      req.adminSession = MOCK_ADMIN_SESSION;
      return Promise.resolve(MOCK_ADMIN_USER);
    }
    if (securityName === "cookie_auth") {
      const user = { id: "user-1", email: "user@example.com", name: "User" };
      req.user = user;
      req.session = { id: "s-1", token: "tok", expiresAt: new Date("2030-01-01") };
      return Promise.resolve(user);
    }
    return Promise.reject({ status: 401, message: "Unauthorized" });
  }),
}));

vi.mock("../repo/adminRepo", () => ({
  findAdminUserByEmail: vi.fn(),
  findAdminSessionWithUser: vi.fn(),
  createAdminSession: vi.fn(),
  deleteAdminSessionById: vi.fn(),
  deleteAdminSessionByToken: vi.fn(),
  deleteAdminUserSessions: vi.fn(),
}));

const app = createApp();

describe("GET /api/admin/auth/session", () => {
  it("should return 200 with admin user and session when authenticated", async () => {
    const response = await request(app).get("/api/admin/auth/session");

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(true);
    expect(response.body.adminUser).toEqual(MOCK_ADMIN_USER);
    expect(response.body.session).toMatchObject({
      expiresAt: MOCK_ADMIN_SESSION.expiresAt.toISOString(),
    });
  });

  it("should return 401 when admin session is missing or invalid", async () => {
    const { expressAuthentication } = await import("../middleware/tsoaAuthentication");
    vi.mocked(expressAuthentication).mockRejectedValueOnce({
      status: 401,
      message: "Unauthorized",
    });

    const response = await request(app).get("/api/admin/auth/session");

    expect(response.status).toBe(401);
  });
});

describe("POST /api/admin/auth/logout", () => {
  it("should return 200 and delete the admin session token", async () => {
    vi.mocked(adminRepo.deleteAdminSessionByToken).mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post("/api/admin/auth/logout")
      .set("Cookie", "admin_session_token=admin-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(adminRepo.deleteAdminSessionByToken).toHaveBeenCalledWith("admin-token");
  });

  it("should return 200 even when no session token cookie is present", async () => {
    const response = await request(app).post("/api/admin/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should return 500 when session deletion fails unexpectedly", async () => {
    vi.mocked(adminRepo.deleteAdminSessionByToken).mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .post("/api/admin/auth/logout")
      .set("Cookie", "admin_session_token=admin-token");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to logout");
  });
});

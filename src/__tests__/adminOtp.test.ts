import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { RegisterRoutes } from "../generated/routes";
import { tsoaErrorHandler } from "../middleware/tsoaErrorHandler";
import { errorLogger } from "../middleware/errorLogger";
import { requestLogger } from "../middleware/requestLogger";
import * as adminOtpServiceModule from "../services/adminOtpService";
import { AdminOtpService } from "../services/adminOtpService";
import * as otpRepo from "../repo/otpRepo";
import * as adminRepo from "../repo/adminRepo";
import { withTransaction } from "../repo/db";
import type { EmailService } from "../services/email/emailService";
import type { EmailResult } from "../services/email/types";
import { randomInt } from "crypto";

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return { ...actual, randomInt: vi.fn(actual.randomInt) };
});

// ── Repo mocks ──────────────────────────────────────────────────────────────

vi.mock("../repo/otpRepo", () => ({
  countRecentOtps: vi.fn(),
  findOldestRecentOtp: vi.fn(),
  deleteExpiredOtps: vi.fn(),
  createOtp: vi.fn(),
  findValidOtp: vi.fn(),
  deleteAllOtpsByEmail: vi.fn(),
}));

vi.mock("../repo/adminRepo", () => ({
  findAdminUserByEmail: vi.fn(),
  findAdminSessionWithUser: vi.fn(),
  createAdminSession: vi.fn(),
  deleteAdminSessionById: vi.fn(),
  deleteAdminSessionByToken: vi.fn(),
  deleteAdminUserSessions: vi.fn(),
}));

vi.mock("../repo/db", () => ({
  prisma: {},
  withTransaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({})),
}));

// ── Regular session repo mock (needed by tsoa auth for cookie_auth) ─────────
vi.mock("../repo/sessionRepo", () => ({
  findSessionWithUser: vi.fn(),
  deleteSessionById: vi.fn(),
  deleteSessionByToken: vi.fn(),
  deleteUserSessions: vi.fn(),
  createSession: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  RegisterRoutes(app);
  app.use(tsoaErrorHandler);
  app.use(errorLogger);
  return app;
};

const MOCK_ADMIN_USER = { id: "admin-1", email: "admin@example.com", name: "Admin" };

const GENERIC_MESSAGE = "If this email is valid, an OTP has been sent.";

// ── POST /api/admin/otp/generate ─────────────────────────────────────────────

describe("Admin OTP API", () => {
  let app: express.Express;
  let adminOtpService: AdminOtpService;
  let mockEmailService: EmailService;

  beforeEach(() => {
    app = createTestApp();

    mockEmailService = {
      sendEmail: vi.fn(),
    } as unknown as EmailService;

    adminOtpService = new AdminOtpService(mockEmailService);

    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

    // Default admin user mock
    vi.mocked(adminRepo.findAdminUserByEmail).mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      createdAt: new Date(),
    });
    vi.mocked(adminRepo.deleteAdminUserSessions).mockResolvedValue({ count: 0 });
    vi.mocked(adminRepo.createAdminSession).mockResolvedValue({
      id: "admin-session-1",
      sessionToken: "admin-token",
      adminUserId: "admin-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("POST /api/admin/otp/generate", () => {
    it("should return 200 with generic message for valid email", async () => {
      const mockRequestOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "requestOtp");
      mockRequestOtp.mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: "admin@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(GENERIC_MESSAGE);
    });

    it("should normalize email to lowercase before processing", async () => {
      const mockRequestOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "requestOtp");
      mockRequestOtp.mockResolvedValueOnce({ success: true });

      await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: "ADMIN@EXAMPLE.COM" })
        .set("Content-Type", "application/json");

      expect(mockRequestOtp).toHaveBeenCalledWith("admin@example.com", expect.anything());
    });

    it("should trim whitespace from email before processing", async () => {
      const mockRequestOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "requestOtp");
      mockRequestOtp.mockResolvedValueOnce({ success: true });

      await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: "  admin@example.com  " })
        .set("Content-Type", "application/json");

      expect(mockRequestOtp).toHaveBeenCalledWith("admin@example.com", expect.anything());
    });

    it("should return 400 for invalid email format", async () => {
      const response = await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: "not-an-email" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
    });

    it("should return 422 for missing email field", async () => {
      const response = await request(app)
        .post("/api/admin/otp/generate")
        .send({})
        .set("Content-Type", "application/json");

      expect(response.status).toBe(422);
      expect(response.body.message).toBe("Validation Failed");
    });

    it("should return 422 for email exceeding 320 characters", async () => {
      const longEmail = "a".repeat(310) + "@example.com";

      const response = await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: longEmail })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(422);
      expect(response.body.message).toBe("Validation Failed");
    });

    it("should return 429 when rate limit is exceeded", async () => {
      const mockRequestOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "requestOtp");
      mockRequestOtp.mockResolvedValueOnce({
        success: false,
        error: "Rate limit exceeded",
        statusCode: 429,
        retryAfter: 300,
      });

      const response = await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: "admin@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(429);
      expect(response.body.error).toBe("Rate limit exceeded");
      expect(response.headers["retry-after"]).toBe("300");
    });

    it("should return generic message even on 429 to prevent enumeration", async () => {
      const mockRequestOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "requestOtp");
      mockRequestOtp.mockResolvedValueOnce({
        success: false,
        error: "Rate limit exceeded",
        statusCode: 429,
        retryAfter: 60,
      });

      const response = await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: "admin@example.com" })
        .set("Content-Type", "application/json");

      expect(response.body.message).toBe(GENERIC_MESSAGE);
    });

    it("should return 200 for non-admin email (no email enumeration)", async () => {
      // Non-admin email should silently succeed — same response as admin email
      const mockRequestOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "requestOtp");
      mockRequestOtp.mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: "regular@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(GENERIC_MESSAGE);
    });

    it("should return 500 on unexpected service error", async () => {
      const mockRequestOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "requestOtp");
      mockRequestOtp.mockRejectedValueOnce(new Error("Unexpected error"));

      const response = await request(app)
        .post("/api/admin/otp/generate")
        .send({ email: "admin@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });
  });

  describe("POST /api/admin/otp/verify", () => {
    it("should verify valid OTP and return session token + admin user", async () => {
      const mockVerifyOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "verifyOtp");
      mockVerifyOtp.mockResolvedValueOnce({
        success: true,
        sessionToken: "admin-session-token",
        adminUser: MOCK_ADMIN_USER,
      });

      const response = await request(app)
        .post("/api/admin/otp/verify")
        .send({ email: "admin@example.com", code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("OTP verified successfully");
      expect(response.body.sessionToken).toBe("admin-session-token");
      expect(response.body.adminUser).toMatchObject(MOCK_ADMIN_USER);
    });

    it("should return 401 for invalid or expired OTP", async () => {
      const mockVerifyOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "verifyOtp");
      mockVerifyOtp.mockResolvedValueOnce({
        success: false,
        error: "Invalid or expired OTP",
        statusCode: 401,
      });

      const response = await request(app)
        .post("/api/admin/otp/verify")
        .send({ email: "admin@example.com", code: 999999 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid or expired OTP");
    });

    it("should return 401 when email belongs to a non-admin user", async () => {
      const mockVerifyOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "verifyOtp");
      mockVerifyOtp.mockResolvedValueOnce({
        success: false,
        error: "Unauthorized",
        statusCode: 401,
      });

      const response = await request(app)
        .post("/api/admin/otp/verify")
        .send({ email: "regular@example.com", code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(401);
    });

    it("should return 422 when email field is missing", async () => {
      const response = await request(app)
        .post("/api/admin/otp/verify")
        .send({ code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(422);
      expect(response.body.message).toBe("Validation Failed");
    });

    it("should return 422 when code field is missing", async () => {
      const response = await request(app)
        .post("/api/admin/otp/verify")
        .send({ email: "admin@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(422);
      expect(response.body.message).toBe("Validation Failed");
    });

    it("should return 400 for invalid email format on verify", async () => {
      const response = await request(app)
        .post("/api/admin/otp/verify")
        .send({ email: "not-valid", code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
    });

    it("should normalize email to lowercase before verifying", async () => {
      const mockVerifyOtp = vi.spyOn(adminOtpServiceModule.adminOtpService, "verifyOtp");
      mockVerifyOtp.mockResolvedValueOnce({ success: true });

      await request(app)
        .post("/api/admin/otp/verify")
        .send({ email: "ADMIN@EXAMPLE.COM", code: 123456 })
        .set("Content-Type", "application/json");

      expect(mockVerifyOtp).toHaveBeenCalledWith("admin@example.com", 123456, expect.anything());
    });
  });

  // ── AdminOtpService unit tests ─────────────────────────────────────────────

  describe("AdminOtpService.requestOtp", () => {
    it("should record an OTP attempt for a non-admin email without sending an email", async () => {
      vi.mocked(adminRepo.findAdminUserByEmail).mockResolvedValue(null);
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });

      const result = await adminOtpService.requestOtp("nobody@example.com");

      expect(result.success).toBe(true);
      expect(otpRepo.createOtp).toHaveBeenCalledWith(
        "nobody@example.com",
        expect.any(Number),
        expect.any(Date),
      );
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it("should send OTP for a known admin email", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      } as EmailResult);

      const result = await adminOtpService.requestOtp("admin@example.com");

      expect(result.success).toBe(true);
      expect(otpRepo.createOtp).toHaveBeenCalled();
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "admin@example.com" }),
        undefined,
      );
    });

    it("should use a 6-digit OTP code in the email", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      } as EmailResult);

      await adminOtpService.requestOtp("admin@example.com");

      const [, code] = vi.mocked(otpRepo.createOtp).mock.calls[0];
      expect(Number.isInteger(code)).toBe(true);
      expect(code).toBeGreaterThanOrEqual(100000);
      expect(code).toBeLessThan(1000000);
    });

    it("should include 999999 in the generated OTP range", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      } as EmailResult);

      await adminOtpService.requestOtp("admin@example.com");

      expect(randomInt).toHaveBeenCalledWith(100000, 1000000);
    });

    it("should return 429 when rate limit is exceeded", async () => {
      const oldestOtpTime = new Date("2024-01-01T11:55:00Z");
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(3);
      vi.mocked(otpRepo.findOldestRecentOtp).mockResolvedValue({
        id: "otp-1",
        email: "admin@example.com",
        code: 123456,
        expiresAt: new Date(),
        createdAt: oldestOtpTime,
      });

      const result = await adminOtpService.requestOtp("admin@example.com");

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.retryAfter).toBe(300); // 5 minutes remaining
    });

    it("should return 500 when email sending fails", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "SMTP timeout",
      } as EmailResult);

      const result = await adminOtpService.requestOtp("admin@example.com");

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe("Failed to send email");
    });

    it("should return 500 on unexpected DB error", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockRejectedValue(new Error("DB down"));

      const result = await adminOtpService.requestOtp("admin@example.com");

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe("Internal server error");
    });
  });

  describe("AdminOtpService.verifyOtp", () => {
    it("should verify valid OTP and create an admin session", async () => {
      const transactionClient = {};
      vi.mocked(withTransaction).mockImplementationOnce(async (callback) =>
        callback(transactionClient as never),
      );
      vi.mocked(otpRepo.findValidOtp).mockResolvedValue({
        id: "otp-1",
        email: "admin@example.com",
        code: 123456,
        expiresAt: new Date("2024-01-01T12:10:00Z"),
        createdAt: new Date("2024-01-01T12:00:00Z"),
      });
      vi.mocked(otpRepo.deleteAllOtpsByEmail).mockResolvedValue({ count: 1 });

      const result = await adminOtpService.verifyOtp("admin@example.com", 123456);

      expect(result.success).toBe(true);
      expect(result.sessionToken).toBeDefined();
      expect(result.sessionToken).toHaveLength(128);
      expect(result.adminUser).toMatchObject({ email: "admin@example.com" });
      expect(otpRepo.deleteAllOtpsByEmail).toHaveBeenCalledWith("admin@example.com", transactionClient);
      expect(adminRepo.findAdminUserByEmail).toHaveBeenCalledWith("admin@example.com", transactionClient);
      expect(adminRepo.deleteAdminUserSessions).toHaveBeenCalledWith("admin-1", transactionClient);
      expect(adminRepo.createAdminSession).toHaveBeenCalledWith(
        expect.any(String),
        "admin-1",
        expect.any(Date),
        transactionClient,
      );
    });

    it("should delete all OTPs for the email after successful verification", async () => {
      vi.mocked(otpRepo.findValidOtp).mockResolvedValue({
        id: "otp-1",
        email: "admin@example.com",
        code: 123456,
        expiresAt: new Date("2024-01-01T12:10:00Z"),
        createdAt: new Date(),
      });
      vi.mocked(otpRepo.deleteAllOtpsByEmail).mockResolvedValue({ count: 1 });

      await adminOtpService.verifyOtp("admin@example.com", 123456);

      expect(otpRepo.deleteAllOtpsByEmail).toHaveBeenCalledWith(
        "admin@example.com",
        expect.anything(),
      );
    });

    it("should return 401 when OTP is invalid or expired", async () => {
      vi.mocked(otpRepo.findValidOtp).mockResolvedValue(null);

      const result = await adminOtpService.verifyOtp("admin@example.com", 999999);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe("Invalid or expired OTP");
      expect(adminRepo.createAdminSession).not.toHaveBeenCalled();
    });

    it("should return 401 when OTP matches but email is not an admin", async () => {
      vi.mocked(otpRepo.findValidOtp).mockResolvedValue({
        id: "otp-1",
        email: "regular@example.com",
        code: 123456,
        expiresAt: new Date("2024-01-01T12:10:00Z"),
        createdAt: new Date(),
      });
      vi.mocked(otpRepo.deleteAllOtpsByEmail).mockResolvedValue({ count: 1 });
      vi.mocked(adminRepo.findAdminUserByEmail).mockResolvedValue(null);

      const result = await adminOtpService.verifyOtp("regular@example.com", 123456);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(adminRepo.createAdminSession).not.toHaveBeenCalled();
    });

    it("should rotate sessions — delete old sessions before creating new one", async () => {
      vi.mocked(otpRepo.findValidOtp).mockResolvedValue({
        id: "otp-1",
        email: "admin@example.com",
        code: 123456,
        expiresAt: new Date("2024-01-01T12:10:00Z"),
        createdAt: new Date(),
      });
      vi.mocked(otpRepo.deleteAllOtpsByEmail).mockResolvedValue({ count: 1 });

      await adminOtpService.verifyOtp("admin@example.com", 123456);

      expect(adminRepo.deleteAdminUserSessions).toHaveBeenCalledWith("admin-1", expect.anything());
      expect(adminRepo.createAdminSession).toHaveBeenCalled();

      const deleteOrder = vi.mocked(adminRepo.deleteAdminUserSessions).mock.invocationCallOrder[0];
      const createOrder = vi.mocked(adminRepo.createAdminSession).mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(createOrder);
    });

    it("should return 500 on unexpected DB error during verification", async () => {
      vi.mocked(otpRepo.findValidOtp).mockRejectedValue(new Error("DB error"));

      const result = await adminOtpService.verifyOtp("admin@example.com", 123456);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe("Internal server error");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import otpRoutes from "../routes/otpRoutes";
import * as otpServiceModule from "../services/otpService";
import { OtpService } from "../services/otpService";
import { prisma } from "../repo/db";
import * as otpRepo from "../repo/otpRepo";
import * as userRepo from "../repo/userRepo";
import * as sessionRepo from "../repo/sessionRepo";
import { requestLogger } from "../middleware/requestLogger";
import type { EmailService } from "../services/email/emailService";
import type { EmailResult } from "../services/email/types";

// Mock repos used by OtpService
vi.mock("../repo/otpRepo", () => ({
  countRecentOtps: vi.fn(),
  findOldestRecentOtp: vi.fn(),
  deleteExpiredOtps: vi.fn(),
  createOtp: vi.fn(),
  findValidOtp: vi.fn(),
  deleteAllOtpsByEmail: vi.fn(),
}));

vi.mock("../repo/userRepo", () => ({
  upsertUserByEmail: vi.fn(),
}));

vi.mock("../repo/sessionRepo", () => ({
  deleteUserSessions: vi.fn(),
  createSession: vi.fn(),
  findSessionWithUser: vi.fn(),
  deleteSessionById: vi.fn(),
  deleteSessionByToken: vi.fn(),
}));

// Mock repo/db — only withTransaction and the models used by syncUserTaskAssignments
// (which receives the transaction client directly and does not go through repos)
vi.mock("../repo/db", () => {
  const mockDb = {
    task: {
      findMany: vi.fn(),
    },
    userTask: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  return {
    prisma: mockDb,
    withTransaction: vi.fn(async (callback) => {
      return callback(mockDb);
    }),
  };
});

// Create test app with OTP routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use(otpRoutes);
  return app;
};

describe("OTP API", () => {
  let app: express.Express;
  let otpService: OtpService;
  let mockEmailService: EmailService;
  const testEmail = "test@example.com";

  beforeEach(() => {
    app = createTestApp();

    // Create mock email service
    mockEmailService = {
      sendEmail: vi.fn(),
    } as unknown as EmailService;

    otpService = new OtpService(mockEmailService);

    vi.clearAllMocks();

    // Set up time mocking
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

    // Default repo mocks for verifyOtp flow (used across service tests)
    vi.mocked(userRepo.upsertUserByEmail).mockResolvedValue({
      id: "user-1",
      email: testEmail,
      name: "test",
      isEU: null,
      employmentStatus: null,
      hasChildren: null,
      housingType: null,
      plannedArrivalDate: null,
      arrivalDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.task.findMany).mockResolvedValue([
      { id: "task-1" },
      { id: "task-2" },
    ] as never);
    vi.mocked(prisma.userTask.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userTask.createMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.userTask.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(sessionRepo.deleteUserSessions).mockResolvedValue({ count: 0 });
    vi.mocked(sessionRepo.createSession).mockResolvedValue({
      id: "session-1",
      sessionToken: "token",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Email Validation (200 with valid email)", () => {
    it("should accept valid email and return 200", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
      expect(mockRequestOtp).toHaveBeenCalledWith("user@example.com", expect.anything());
    });

    it("should normalize email to lowercase", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "User@EXAMPLE.COM" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("user@example.com", expect.anything());
    });

    it("should trim whitespace from email", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "  user@example.com  " })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("user@example.com", expect.anything());
    });

    it("should accept email with plus addressing", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user+tag@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("user+tag@example.com", expect.anything());
    });

    it("should accept email with subdomain", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user@mail.example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("user@mail.example.com", expect.anything());
    });

    it("should accept email at exactly 320 characters", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      // Create an email exactly 320 chars: local (64) + @ (1) + domain (255)
      const localPart = "a".repeat(64);
      const label = "b".repeat(63);
      const domainPart = `${label}.${label}.${label}.${label}`;
      const exactLengthEmail = `${localPart}@${domainPart}`;

      expect(exactLengthEmail.length).toBe(320);

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: exactLengthEmail })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
    });
  });

  describe("Invalid Email Format - 400 Errors (missing @, no domain, too long, injection)", () => {
    it("should return 400 for missing email", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({})
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is required");
      expect(response.body.message).toBeUndefined();
    });

    it("should return 400 for non-string email", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({ email: 12345 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is required");
      expect(response.body.message).toBeUndefined();
    });

    it("should return 400 for email without @ symbol (missing @)", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "notanemail" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBeUndefined();
    });

    it("should return 400 for email without domain (no domain)", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user@" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBeUndefined();
    });

    it("should return 400 for email without local part", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBeUndefined();
    });

    it("should return 400 for email with spaces", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user name@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBeUndefined();
    });

    it("should return 400 for email with multiple @ symbols", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user@@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBeUndefined();
    });

    it("should return 400 for email exceeding 320 characters (too long)", async () => {
      const longEmail = "a".repeat(310) + "@example.com"; // 323 characters total

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: longEmail })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email exceeds maximum length");
      expect(response.body.message).toBeUndefined();
    });

    it("should return 400 for potential SQL injection attempt (injection attempt)", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user'; DROP TABLE users; --@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBeUndefined();
    });
  });

  describe("Rate Limiting - 429 after 3 requests within 10-minute window", () => {
    it("should return 429 after 3 requests within 10-minute window", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({
        success: false,
        error: "Rate limit exceeded",
        statusCode: 429,
        retryAfter: 300,
      });

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: testEmail })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(429);
      expect(response.body.error).toBe("Rate limit exceeded");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
      expect(response.headers["retry-after"]).toBe("300");
    });

    it("should include correct Retry-After header on rate limit", async () => {
      const oldestOtpTime = new Date("2024-01-01T11:55:00Z"); // 5 minutes ago

      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(3);
      vi.mocked(otpRepo.findOldestRecentOtp).mockResolvedValue({
        id: "oldest-id",
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: oldestOtpTime,
      });

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.retryAfter).toBeDefined();
      // Should retry after 5 minutes (time until oldest OTP expires from 10-minute window)
      expect(result.retryAfter).toBe(300); // 5 minutes = 300 seconds
    });

    it("should allow request when less than 3 recent OTPs exist", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(2);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);
    });

    it("should reject request when 3 or more recent OTPs exist", async () => {
      const oldestOtpTime = new Date("2024-01-01T11:55:00Z");

      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(3);
      vi.mocked(otpRepo.findOldestRecentOtp).mockResolvedValue({
        id: "oldest-id",
        email: testEmail,
        code: 123456,
        expiresAt: new Date(),
        createdAt: oldestOtpTime,
      });

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.error).toBe("Rate limit exceeded");
      expect(otpRepo.createOtp).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("Rate Limit Reset - 429 resets after window expires", () => {
    it("should reset rate limit after 10-minute window expires (manipulate DB timestamps)", async () => {
      // First request at 11:50:00 - should succeed
      vi.setSystemTime(new Date("2024-01-01T11:50:00Z"));
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      let result = await otpService.requestOtp(testEmail);
      expect(result.success).toBe(true);

      // Move time forward to 12:00:30 (10 minutes and 30 seconds after first request)
      vi.setSystemTime(new Date("2024-01-01T12:00:30Z"));

      // The OTP from 11:50:00 should now be outside the 10-minute window
      const windowStartTime = new Date(new Date("2024-01-01T12:00:30Z").getTime() - 10 * 60 * 1000);
      // windowStartTime = 11:50:30, so the OTP at 11:50:00 is outside the window

      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 1 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);

      result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);
      // Verify rate limit window only counts OTPs from last 10 minutes
      expect(otpRepo.countRecentOtps).toHaveBeenCalledWith(testEmail, windowStartTime);
    });

    it("should count OTPs from last 10 minutes only", async () => {
      const now = new Date("2024-01-01T12:00:00Z");
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(2);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      expect(otpRepo.countRecentOtps).toHaveBeenCalledWith(testEmail, tenMinutesAgo);
    });
  });

  describe("Expired OTP Cleanup - Expired OTPs are cleaned before new OTP insertion", () => {
    it("should delete expired OTPs before creating new one", async () => {
      const now = new Date("2024-01-01T12:00:00Z");

      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 2 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      expect(otpRepo.deleteExpiredOtps).toHaveBeenCalledWith(testEmail);

      // Verify deletion happens before creation
      const deleteCall = vi.mocked(otpRepo.deleteExpiredOtps).mock.invocationCallOrder[0];
      const createCall = vi.mocked(otpRepo.createOtp).mock.invocationCallOrder[0];
      expect(deleteCall).toBeLessThan(createCall);
    });

    it("should handle cleanup when no expired OTPs exist", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);
      expect(otpRepo.deleteExpiredOtps).toHaveBeenCalled();
    });
  });

  describe("DB Record Validation - Correct expiresAt (~10 min) and integer code", () => {
    it("should generate 6-digit integer OTP code", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);

      // Verify the OTP is a 6-digit integer
      const [, otpCode] = vi.mocked(otpRepo.createOtp).mock.calls[0];

      expect(Number.isInteger(otpCode)).toBe(true);
      expect(otpCode).toBeGreaterThanOrEqual(100000);
      expect(otpCode).toBeLessThan(1000000);
    });

    it("should set expiresAt to approximately 10 minutes from now", async () => {
      const now = new Date("2024-01-01T12:00:00Z");
      const expectedExpiry = new Date("2024-01-01T12:10:00Z");

      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      const [, , expiresAt] = vi.mocked(otpRepo.createOtp).mock.calls[0];

      // Verify expiration is 10 minutes from now
      expect((expiresAt as Date).getTime()).toBe(expectedExpiry.getTime());

      // Verify it's exactly 10 minutes
      const diffInMinutes = ((expiresAt as Date).getTime() - now.getTime()) / (60 * 1000);
      expect(diffInMinutes).toBe(10);
    });

    it("should store email, code, and expiresAt in DB record", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      expect(otpRepo.createOtp).toHaveBeenCalledWith(
        testEmail,
        expect.any(Number),
        expect.any(Date),
      );
    });
  });

  describe("Email Sending - Mock email service to avoid real sends", () => {
    it("should send OTP via email service (mocked to avoid real sends)", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        {
          to: testEmail,
          subject: "Your Hello Norway Login Code",
          text: expect.stringContaining("login code"),
          html: expect.stringContaining("login code"),
        },
        undefined,
      );

      // Verify email service was mocked (not real send)
      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it("should include OTP code in email content", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      } as EmailResult);

      await otpService.requestOtp(testEmail);

      const emailCall = (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mock
        .calls[0][0];

      // Extract the OTP code that was passed to createOtp
      const [, otpCode] = vi.mocked(otpRepo.createOtp).mock.calls[0];

      expect(emailCall.text).toContain(otpCode.toString());
      expect(emailCall.html).toContain(otpCode.toString());
    });

    it("should return error when email sending fails", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockResolvedValue({} as never);
      (mockEmailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "SMTP connection failed",
      } as EmailResult);

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe("Failed to send email");
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe("Internal server error");
    });

    it("should handle OTP creation errors", async () => {
      vi.mocked(otpRepo.countRecentOtps).mockResolvedValue(0);
      vi.mocked(otpRepo.deleteExpiredOtps).mockResolvedValue({ count: 0 });
      vi.mocked(otpRepo.createOtp).mockRejectedValue(new Error("Insert failed"));

      const result = await otpService.requestOtp(testEmail);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe("Internal server error");
    });

    it("should handle unexpected exceptions in controller", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockRejectedValue(new Error("Unexpected error"));

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });
  });

  describe("Security - Email Enumeration Prevention", () => {
    it("should return generic message only for valid email attempts", async () => {
      // Validation errors (before send attempt) should NOT have generic message
      const validationErrors = [
        { email: "", expectedStatus: 400 },
        { email: "invalid-email", expectedStatus: 400 },
        { email: "a".repeat(330) + "@example.com", expectedStatus: 400 },
      ];

      for (const testCase of validationErrors) {
        const response = await request(app)
          .post("/otp/generate")
          .send({ email: testCase.email })
          .set("Content-Type", "application/json");

        expect(response.body.message).toBeUndefined();
        expect(response.body.error).toBeDefined();
      }

      // Valid emails (after send attempt) SHOULD have generic message
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const validResponse = await request(app)
        .post("/otp/generate")
        .send({ email: "valid@example.com" })
        .set("Content-Type", "application/json");

      expect(validResponse.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should not reveal whether email exists in system (for valid emails)", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const existingEmailResponse = await request(app)
        .post("/otp/generate")
        .send({ email: "existing@example.com" })
        .set("Content-Type", "application/json");

      const nonExistingEmailResponse = await request(app)
        .post("/otp/generate")
        .send({ email: "nonexisting@example.com" })
        .set("Content-Type", "application/json");

      // Both should have the same status and message
      expect(existingEmailResponse.status).toBe(200);
      expect(nonExistingEmailResponse.status).toBe(200);
      expect(existingEmailResponse.body.message).toBe(nonExistingEmailResponse.body.message);
      expect(existingEmailResponse.body.message).toBe("If this email is valid, an OTP has been sent.");
    });
  });

  describe("POST /otp/verify - OTP Verification", () => {
    it("should verify valid OTP successfully", async () => {
      const mockVerifyOtp = vi.spyOn(otpServiceModule.otpService, "verifyOtp");
      mockVerifyOtp.mockResolvedValue({
        success: true,
        sessionToken: "session-token",
        user: { id: "user-1", email: "user@example.com", name: "user" },
      });

      const response = await request(app)
        .post("/otp/verify")
        .send({ email: "user@example.com", code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("OTP verified successfully");
      expect(response.body.sessionToken).toBe("session-token");
      expect(mockVerifyOtp).toHaveBeenCalledWith("user@example.com", 123456, expect.anything());
    });

    it("should reject invalid OTP", async () => {
      const mockVerifyOtp = vi.spyOn(otpServiceModule.otpService, "verifyOtp");
      mockVerifyOtp.mockResolvedValue({
        success: false,
        error: "Invalid or expired OTP",
        statusCode: 401
      });

      const response = await request(app)
        .post("/otp/verify")
        .send({ email: "user@example.com", code: 999999 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid or expired OTP");
    });

    it("should require email field", async () => {
      const response = await request(app)
        .post("/otp/verify")
        .send({ code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is required");
    });

    it("should require code field", async () => {
      const response = await request(app)
        .post("/otp/verify")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("OTP code is required");
    });

    it("should validate email format", async () => {
      const response = await request(app)
        .post("/otp/verify")
        .send({ email: "invalid-email", code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
    });

    it("should normalize email to lowercase", async () => {
      const mockVerifyOtp = vi.spyOn(otpServiceModule.otpService, "verifyOtp");
      mockVerifyOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/verify")
        .send({ email: "User@EXAMPLE.COM", code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockVerifyOtp).toHaveBeenCalledWith("user@example.com", 123456, expect.anything());
    });

    it("should handle expired OTP", async () => {
      const mockVerifyOtp = vi.spyOn(otpServiceModule.otpService, "verifyOtp");
      mockVerifyOtp.mockResolvedValue({
        success: false,
        error: "Invalid or expired OTP",
        statusCode: 401
      });

      const response = await request(app)
        .post("/otp/verify")
        .send({ email: "user@example.com", code: 123456 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid or expired OTP");
    });
  });

  describe("OTP Service - verifyOtp method", () => {
    it("should verify valid OTP and delete all OTPs for email", async () => {
      const futureExpiry = new Date("2024-01-01T12:10:00Z");

      vi.mocked(otpRepo.findValidOtp).mockResolvedValue({
        id: "test-id",
        email: testEmail,
        code: 123456,
        expiresAt: futureExpiry,
        createdAt: new Date("2024-01-01T12:00:00Z"),
      });
      vi.mocked(otpRepo.deleteAllOtpsByEmail).mockResolvedValue({ count: 1 });

      const result = await otpService.verifyOtp(testEmail, 123456);

      expect(result.success).toBe(true);
      expect(otpRepo.findValidOtp).toHaveBeenCalledWith(testEmail, 123456);
      expect(otpRepo.deleteAllOtpsByEmail).toHaveBeenCalledWith(testEmail, expect.anything());
      expect(sessionRepo.deleteUserSessions).toHaveBeenCalledWith("user-1", expect.anything());
      const [sessionToken] = vi.mocked(sessionRepo.createSession).mock.calls[0];
      expect(sessionToken).toHaveLength(128);
    });

    it("should reject expired OTP", async () => {
      vi.mocked(otpRepo.findValidOtp).mockResolvedValue(null);

      const result = await otpService.verifyOtp(testEmail, 123456);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or expired OTP");
      expect(result.statusCode).toBe(401);
    });

    it("should skip creating user tasks when no relevant tasks are found", async () => {
      vi.mocked(otpRepo.findValidOtp).mockResolvedValue({
        id: "test-id",
        email: testEmail,
        code: 123456,
        expiresAt: new Date("2024-01-01T12:10:00Z"),
        createdAt: new Date("2024-01-01T12:00:00Z"),
      });
      vi.mocked(otpRepo.deleteAllOtpsByEmail).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);

      const result = await otpService.verifyOtp(testEmail, 123456);

      expect(result.success).toBe(true);
      expect(prisma.userTask.createMany).not.toHaveBeenCalled();
    });

    it("should roll back all operations when task assignment fails in transaction", async () => {
      vi.mocked(otpRepo.findValidOtp).mockResolvedValue({
        id: "test-id",
        email: testEmail,
        code: 123456,
        expiresAt: new Date("2024-01-01T12:10:00Z"),
        createdAt: new Date("2024-01-01T12:00:00Z"),
      });

      // Mock task assignment to fail
      vi.mocked(prisma.task.findMany).mockRejectedValue(new Error("Task assignment failed"));

      const result = await otpService.verifyOtp(testEmail, 123456);

      // Transaction should fail and return error
      expect(result.success).toBe(false);
      expect(result.error).toBe("Internal server error");
      expect(result.statusCode).toBe(500);

      // Verify that the initial OTP lookup was called but not the session creation
      expect(otpRepo.findValidOtp).toHaveBeenCalled();
      expect(sessionRepo.createSession).not.toHaveBeenCalled();
    });
  });
});

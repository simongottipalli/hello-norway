import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { requestOtp } from "../controllers/otpController";
import * as otpServiceModule from "../services/otpService";

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.post("/otp/request", requestOtp);
  return app;
};

describe("OTP Controller", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  describe("POST /otp/request - Valid Requests", () => {
    it("should accept valid email and return generic message", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
      expect(mockRequestOtp).toHaveBeenCalledWith("user@example.com");
    });

    it("should normalize email to lowercase before processing", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "User@EXAMPLE.COM" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("user@example.com");
    });

    it("should trim whitespace from email", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "  user@example.com  " })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("user@example.com");
    });

    it("should accept email with plus addressing", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user+tag@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("user+tag@example.com");
    });

    it("should accept email with dots in local part", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "first.last@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("first.last@example.com");
    });

    it("should accept email with subdomain", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user@mail.example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalledWith("user@mail.example.com");
    });
  });

  describe("POST /otp/request - Invalid Email Format", () => {
    it("should return 400 for missing email", async () => {
      const response = await request(app)
        .post("/otp/request")
        .send({})
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is required");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should return 400 for non-string email", async () => {
      const response = await request(app)
        .post("/otp/request")
        .send({ email: 12345 })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is required");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should return 400 for email without @ symbol", async () => {
      const response = await request(app)
        .post("/otp/request")
        .send({ email: "notanemail" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should return 400 for email without domain", async () => {
      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user@" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should return 400 for email without local part", async () => {
      const response = await request(app)
        .post("/otp/request")
        .send({ email: "@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should return 400 for email with spaces", async () => {
      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user name@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should return 400 for email with multiple @ symbols", async () => {
      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user@@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });
  });

  describe("POST /otp/request - Email Length Validation", () => {
    it("should return 400 for email exceeding 320 characters", async () => {
      const longEmail = "a".repeat(310) + "@example.com"; // 323 characters total

      const response = await request(app)
        .post("/otp/request")
        .send({ email: longEmail })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email exceeds maximum length");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should accept email at exactly 320 characters", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      // Create an email exactly 320 chars: local (64) + @ (1) + domain (255)
      // Domain must have valid labels (max 63 chars each)
      const localPart = "a".repeat(64);
      // Create domain with multiple labels, each <= 63 chars
      // 4 labels of 63 chars each = 252 chars + 3 dots = 255 chars
      const label = "b".repeat(63);
      const domainPart = `${label}.${label}.${label}.${label}`;
      const exactLengthEmail = `${localPart}@${domainPart}`;

      expect(exactLengthEmail.length).toBe(320);

      const response = await request(app)
        .post("/otp/request")
        .send({ email: exactLengthEmail })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(mockRequestOtp).toHaveBeenCalled();
    });
  });

  describe("POST /otp/request - Service Error Handling", () => {
    it("should return 429 when service returns rate limit error", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({
        success: false,
        error: "Rate limit exceeded",
        statusCode: 429,
        retryAfter: 300,
      });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(429);
      expect(response.body.error).toBe("Rate limit exceeded");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
      expect(response.headers["retry-after"]).toBe("300");
    });

    it("should return 500 when service returns internal error", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({
        success: false,
        error: "Database connection failed",
        statusCode: 500,
      });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Database connection failed");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should default to 500 when service returns error without status code", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({
        success: false,
        error: "Unknown error",
      });

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Unknown error");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });

    it("should handle unexpected exceptions gracefully", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockRejectedValue(new Error("Unexpected error"));

      const response = await request(app)
        .post("/otp/request")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
    });
  });

  describe("POST /otp/request - Security (Email Enumeration Prevention)", () => {
    it("should return generic message for all responses", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const testCases = [
        { email: "valid@example.com", expectedStatus: 200 },
        { email: "invalid-email", expectedStatus: 400 },
        { email: "a".repeat(330) + "@example.com", expectedStatus: 400 },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post("/otp/request")
          .send({ email: testCase.email })
          .set("Content-Type", "application/json");

        expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
      }
    });

    it("should not reveal whether email exists in system", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      
      // Simulate service behavior: success for both existing and non-existing emails
      mockRequestOtp.mockResolvedValue({ success: true });

      const existingEmailResponse = await request(app)
        .post("/otp/request")
        .send({ email: "existing@example.com" })
        .set("Content-Type", "application/json");

      const nonExistingEmailResponse = await request(app)
        .post("/otp/request")
        .send({ email: "nonexisting@example.com" })
        .set("Content-Type", "application/json");

      // Both should have the same status and message
      expect(existingEmailResponse.status).toBe(200);
      expect(nonExistingEmailResponse.status).toBe(200);
      expect(existingEmailResponse.body.message).toBe(nonExistingEmailResponse.body.message);
    });
  });
});

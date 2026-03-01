import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import otpRoutes from "../routes/otpRoutes";
import * as otpServiceModule from "../services/otpService";

// Create test app with only OTP routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(otpRoutes);
  return app;
};

describe("OTP Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  describe("POST /otp/generate", () => {
    it("should handle POST requests to /otp/generate", async () => {
      const mockRequestOtp = vi.spyOn(otpServiceModule.otpService, "requestOtp");
      mockRequestOtp.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "user@example.com" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("If this email is valid, an OTP has been sent.");
      expect(mockRequestOtp).toHaveBeenCalledWith("user@example.com");
    });

    it("should validate email before processing", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({ email: "invalid-email" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
    });

    it("should require email field", async () => {
      const response = await request(app)
        .post("/otp/generate")
        .send({})
        .set("Content-Type", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is required");
    });
  });
});

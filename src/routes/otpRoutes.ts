import { Router } from "express";
import { findLatestValidOtp } from "../repo/otpRepo";

const router = Router();

// Test-only endpoint: returns the latest valid OTP code for a given email.
// Only available when NODE_ENV === 'test' to prevent accidental exposure in production.
// Performance note: OTPCode table stays small during E2E runs (a handful of codes at most),
// so the unindexed compound filter on (email, expiresAt, createdAt) is acceptable here.
if (process.env.NODE_ENV === "test") {
  router.get("/otp/test-peek", async (req, res) => {
    const email = typeof req.query.email === "string" ? req.query.email : "";
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ error: "email query param required" });
    }
    const otp = await findLatestValidOtp(normalizedEmail, "USER");
    if (!otp) {
      return res.status(404).json({ error: "No valid OTP found" });
    }
    return res.status(200).json({ code: otp.code });
  });
}

export default router;

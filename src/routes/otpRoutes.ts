import { Router } from "express";
import { requestOtp as generateOtp, verifyOtp } from "../controllers/otpController";
import { prisma } from "../lib/prisma";

const router = Router();

router.post("/otp/generate", generateOtp);
router.post("/otp/verify", verifyOtp);

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
    const otp = await prisma.oTPCode.findFirst({
      where: { email: normalizedEmail, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) {
      return res.status(404).json({ error: "No valid OTP found" });
    }
    return res.status(200).json({ code: otp.code });
  });
}

export default router;

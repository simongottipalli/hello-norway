import { Router } from "express";
import { requestOtp as generateOtp, verifyOtp } from "../controllers/otpController";

const router = Router();

router.post("/otp/generate", generateOtp);
router.post("/otp/verify", verifyOtp);

export default router;

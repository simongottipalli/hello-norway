import { Router } from "express";
import { requestOtp as generateOtp } from "../controllers/otpController";

const router = Router();

router.post("/otp/generate", generateOtp);

export default router;

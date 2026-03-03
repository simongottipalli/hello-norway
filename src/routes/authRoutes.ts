import { Router } from "express";
import { authenticateSession } from "../middleware/authMiddleware";

const router = Router();

router.get("/auth/session", authenticateSession, (req, res) => {
  return res.status(200).json({
    authenticated: true,
    user: req.user,
    session: {
      expiresAt: req.session?.expiresAt,
    },
  });
});

export default router;

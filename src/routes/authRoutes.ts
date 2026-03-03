import { Router } from "express";
import { authenticateSession } from "../middleware/authMiddleware";
import { prisma } from "../lib/prisma";

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

router.post("/auth/logout", async (req, res) => {
  const sessionToken = req.cookies.session_token;

  if (sessionToken) {
    await prisma.session.deleteMany({ where: { sessionToken } });
  }

  return res.status(200).json({ success: true });
});

export default router;

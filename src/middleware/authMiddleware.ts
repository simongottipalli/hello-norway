import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const SESSION_COOKIE_NAME = "session_token";

export const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
    req.session = {
      id: session.id,
      token: session.sessionToken,
      expiresAt: session.expiresAt,
    };

    next();
  } catch (error: unknown) {
    req.logger.error({ msg: "Session authentication failed", error });
    return res.status(401).json({ error: "Unauthorized" });
  }
};

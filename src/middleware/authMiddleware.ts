import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const SESSION_COOKIE_NAME = "session_token";

const getSessionTokenFromCookie = (cookieHeader?: string): string | null => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return null;

  const [, value] = sessionCookie.split("=");
  return value || null;
};

export const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = getSessionTokenFromCookie(req.headers.cookie);
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

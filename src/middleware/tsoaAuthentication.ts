import { Request } from "express";
import * as sessionRepo from "../repo/sessionRepo";

const SESSION_COOKIE_NAME = "session_token";

export async function expressAuthentication(
  request: Request,
  securityName: string,
  _scopes?: string[]
): Promise<{ id: string; email: string; name: string | null }> {
  if (securityName === "cookie_auth") {
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionToken) {
      throw { status: 401, message: "Unauthorized" };
    }

    const session = await sessionRepo.findSessionWithUser(sessionToken);

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await sessionRepo.deleteSessionById(session.id);
      }
      throw { status: 401, message: "Unauthorized" };
    }

    request.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
    request.session = {
      id: session.id,
      token: session.sessionToken,
      expiresAt: session.expiresAt,
    };

    return request.user;
  }

  throw { status: 401, message: "Unknown security scheme" };
}

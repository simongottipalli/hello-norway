import { Request } from "express";
import * as sessionRepo from "../repo/sessionRepo";
import * as adminRepo from "../repo/adminRepo";

const SESSION_COOKIE_NAME = "session_token";
const ADMIN_SESSION_COOKIE_NAME = "admin_session_token";

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

  if (securityName === "admin_cookie_auth") {
    const sessionToken = request.cookies?.[ADMIN_SESSION_COOKIE_NAME];

    if (!sessionToken) {
      throw { status: 401, message: "Unauthorized" };
    }

    const session = await adminRepo.findAdminSessionWithUser(sessionToken);

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await adminRepo.deleteAdminSessionById(session.id);
      }
      throw { status: 401, message: "Unauthorized" };
    }

    request.adminUser = {
      id: session.adminUser.id,
      email: session.adminUser.email,
      name: session.adminUser.name,
    };
    request.adminSession = {
      id: session.id,
      token: session.sessionToken,
      expiresAt: session.expiresAt,
    };

    return request.adminUser as { id: string; email: string; name: string | null };
  }

  throw { status: 401, message: "Unknown security scheme" };
}

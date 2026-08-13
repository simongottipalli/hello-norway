import { prisma, type DbClient } from "./db";

type AdminDb = Pick<DbClient, "adminUser" | "adminSession">;

// ── AdminUser ──────────────────────────────────────────────────────────────

export const findAdminUserByEmail = (email: string, db: AdminDb = prisma) =>
  db.adminUser.findUnique({ where: { email } });

// ── AdminSession ───────────────────────────────────────────────────────────

export const findAdminSessionWithUser = (sessionToken: string, db: AdminDb = prisma) =>
  db.adminSession.findUnique({
    where: { sessionToken },
    include: { adminUser: true },
  });

export const createAdminSession = (
  sessionToken: string,
  adminUserId: string,
  expiresAt: Date,
  db: AdminDb = prisma,
) =>
  db.adminSession.create({
    data: { sessionToken, adminUserId, expiresAt },
  });

export const deleteAdminSessionById = (id: string, db: AdminDb = prisma) =>
  db.adminSession.delete({ where: { id } });

export const deleteAdminSessionByToken = (sessionToken: string, db: AdminDb = prisma) =>
  db.adminSession.deleteMany({ where: { sessionToken } });

export const deleteAdminUserSessions = (adminUserId: string, db: AdminDb = prisma) =>
  db.adminSession.deleteMany({ where: { adminUserId } });

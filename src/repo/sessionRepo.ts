import { prisma, type DbClient } from "./db";

type SessionDb = Pick<DbClient, "session">;

export const findSessionWithUser = (sessionToken: string, db: SessionDb = prisma) =>
  db.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

export const deleteSessionById = (id: string, db: SessionDb = prisma) =>
  db.session.delete({ where: { id } });

export const deleteSessionByToken = (sessionToken: string, db: SessionDb = prisma) =>
  db.session.deleteMany({ where: { sessionToken } });

export const deleteUserSessions = (userId: string, db: SessionDb = prisma) =>
  db.session.deleteMany({ where: { userId } });

export const createSession = (
  sessionToken: string,
  userId: string,
  expiresAt: Date,
  db: SessionDb = prisma,
) =>
  db.session.create({
    data: { sessionToken, userId, expiresAt },
  });

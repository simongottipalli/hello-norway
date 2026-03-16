import { prisma } from "../lib/prisma";

type OtpDb = Pick<typeof prisma, "oTPCode">;

export const countRecentOtps = (email: string, windowStartTime: Date, db: OtpDb = prisma) =>
  db.oTPCode.count({
    where: { email, createdAt: { gte: windowStartTime } },
  });

export const findOldestRecentOtp = (email: string, windowStartTime: Date, db: OtpDb = prisma) =>
  db.oTPCode.findFirst({
    where: { email, createdAt: { gte: windowStartTime } },
    orderBy: { createdAt: "asc" },
  });

export const deleteExpiredOtps = (email: string, db: OtpDb = prisma) =>
  db.oTPCode.deleteMany({
    where: { email, expiresAt: { lt: new Date() } },
  });

export const createOtp = (
  email: string,
  code: number,
  expiresAt: Date,
  db: OtpDb = prisma,
) =>
  db.oTPCode.create({
    data: { email, code, expiresAt },
  });

export const findValidOtp = (email: string, code: number, db: OtpDb = prisma) =>
  db.oTPCode.findFirst({
    where: { email, code, expiresAt: { gt: new Date() } },
  });

export const deleteAllOtpsByEmail = (email: string, db: OtpDb = prisma) =>
  db.oTPCode.deleteMany({ where: { email } });

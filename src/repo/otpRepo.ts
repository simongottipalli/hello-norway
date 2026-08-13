import { prisma, type DbClient } from "./db";

type OtpDb = Pick<DbClient, "oTPCode">;
export type OtpPurpose = "USER" | "ADMIN";

export const countRecentOtps = (
  email: string,
  windowStartTime: Date,
  purpose: OtpPurpose,
  db: OtpDb = prisma,
) =>
  db.oTPCode.count({
    where: { email, purpose, createdAt: { gte: windowStartTime } },
  });

export const findOldestRecentOtp = (
  email: string,
  windowStartTime: Date,
  purpose: OtpPurpose,
  db: OtpDb = prisma,
) =>
  db.oTPCode.findFirst({
    where: { email, purpose, createdAt: { gte: windowStartTime } },
    orderBy: { createdAt: "asc" },
  });

export const deleteExpiredOtps = (email: string, purpose: OtpPurpose, db: OtpDb = prisma) =>
  db.oTPCode.deleteMany({
    where: { email, purpose, expiresAt: { lt: new Date() } },
  });

export const createOtp = (
  email: string,
  code: number,
  expiresAt: Date,
  purpose: OtpPurpose,
  db: OtpDb = prisma,
) =>
  db.oTPCode.create({
    data: { email, code, expiresAt, purpose },
  });

export const findValidOtp = (email: string, code: number, purpose: OtpPurpose, db: OtpDb = prisma) =>
  db.oTPCode.findFirst({
    where: { email, code, purpose, expiresAt: { gt: new Date() } },
  });

export const deleteAllOtpsByEmail = (email: string, purpose: OtpPurpose, db: OtpDb = prisma) =>
  db.oTPCode.deleteMany({ where: { email, purpose } });

export const findLatestValidOtp = (email: string, purpose: OtpPurpose, db: OtpDb = prisma) =>
  db.oTPCode.findFirst({
    where: { email, purpose, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

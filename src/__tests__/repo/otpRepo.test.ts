import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as otpRepo from "../../repo/otpRepo";
import { prisma } from "../../lib/prisma";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    oTPCode: {
      count: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("otpRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("countRecentOtps", () => {
    it("counts OTP records created at or after the window start time", async () => {
      vi.mocked(prisma.oTPCode.count).mockResolvedValue(2);
      const windowStart = new Date("2024-01-01T11:50:00Z");
      const result = await otpRepo.countRecentOtps("user@example.com", windowStart);
      expect(result).toBe(2);
      expect(prisma.oTPCode.count).toHaveBeenCalledWith({
        where: { email: "user@example.com", createdAt: { gte: windowStart } },
      });
    });
  });

  describe("findOldestRecentOtp", () => {
    it("returns the oldest OTP in the window for rate-limit retry calculation", async () => {
      const oldestOtp = { id: "otp-1", email: "user@example.com", code: 123456, expiresAt: new Date(), createdAt: new Date("2024-01-01T11:51:00Z") };
      vi.mocked(prisma.oTPCode.findFirst).mockResolvedValue(oldestOtp);
      const windowStart = new Date("2024-01-01T11:50:00Z");
      const result = await otpRepo.findOldestRecentOtp("user@example.com", windowStart);
      expect(result).toBe(oldestOtp);
      expect(prisma.oTPCode.findFirst).toHaveBeenCalledWith({
        where: { email: "user@example.com", createdAt: { gte: windowStart } },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  describe("deleteExpiredOtps", () => {
    it("deletes OTPs whose expiresAt is before now", async () => {
      vi.mocked(prisma.oTPCode.deleteMany).mockResolvedValue({ count: 1 });
      await otpRepo.deleteExpiredOtps("user@example.com");
      expect(prisma.oTPCode.deleteMany).toHaveBeenCalledWith({
        where: { email: "user@example.com", expiresAt: { lt: new Date("2024-01-01T12:00:00Z") } },
      });
    });
  });

  describe("createOtp", () => {
    it("creates an OTP record with the given email, code, and expiry", async () => {
      vi.mocked(prisma.oTPCode.create).mockResolvedValue({} as never);
      const expiresAt = new Date("2024-01-01T12:10:00Z");
      await otpRepo.createOtp("user@example.com", 123456, expiresAt);
      expect(prisma.oTPCode.create).toHaveBeenCalledWith({
        data: { email: "user@example.com", code: 123456, expiresAt },
      });
    });
  });

  describe("findValidOtp", () => {
    it("finds an OTP that is not yet expired", async () => {
      const record = { id: "otp-1", email: "user@example.com", code: 123456, expiresAt: new Date("2024-01-01T12:10:00Z"), createdAt: new Date() };
      vi.mocked(prisma.oTPCode.findFirst).mockResolvedValue(record);
      const result = await otpRepo.findValidOtp("user@example.com", 123456);
      expect(result).toBe(record);
      expect(prisma.oTPCode.findFirst).toHaveBeenCalledWith({
        where: {
          email: "user@example.com",
          code: 123456,
          expiresAt: { gt: new Date("2024-01-01T12:00:00Z") },
        },
      });
    });

    it("returns null when no matching valid OTP exists", async () => {
      vi.mocked(prisma.oTPCode.findFirst).mockResolvedValue(null);
      const result = await otpRepo.findValidOtp("user@example.com", 999999);
      expect(result).toBeNull();
    });
  });

  describe("deleteAllOtpsByEmail", () => {
    it("deletes all OTPs for the given email regardless of expiry", async () => {
      vi.mocked(prisma.oTPCode.deleteMany).mockResolvedValue({ count: 3 });
      await otpRepo.deleteAllOtpsByEmail("user@example.com");
      expect(prisma.oTPCode.deleteMany).toHaveBeenCalledWith({
        where: { email: "user@example.com" },
      });
    });

    it("accepts a custom db instance", async () => {
      const mockDb = { oTPCode: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) } };
      await otpRepo.deleteAllOtpsByEmail("user@example.com", mockDb as Parameters<typeof otpRepo.deleteAllOtpsByEmail>[1]);
      expect(mockDb.oTPCode.deleteMany).toHaveBeenCalled();
      expect(prisma.oTPCode.deleteMany).not.toHaveBeenCalled();
    });
  });
});

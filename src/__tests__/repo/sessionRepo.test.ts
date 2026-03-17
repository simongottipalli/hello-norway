import { describe, it, expect, vi, beforeEach } from "vitest";
import * as sessionRepo from "../../repo/sessionRepo";
import { prisma } from "../../lib/prisma";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("sessionRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findSessionWithUser", () => {
    it("queries by sessionToken and includes the user relation", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);
      await sessionRepo.findSessionWithUser("token-abc");
      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { sessionToken: "token-abc" },
        include: { user: true },
      });
    });

    it("returns the session with user when found", async () => {
      const session = {
        id: "session-1",
        sessionToken: "token-abc",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        user: { id: "user-1", email: "test@example.com", name: "Test" },
      };
      vi.mocked(prisma.session.findUnique).mockResolvedValue(session as never);
      const result = await sessionRepo.findSessionWithUser("token-abc");
      expect(result).toBe(session);
    });
  });

  describe("deleteSessionById", () => {
    it("deletes the session row by id", async () => {
      vi.mocked(prisma.session.delete).mockResolvedValue({} as never);
      await sessionRepo.deleteSessionById("session-1");
      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: "session-1" } });
    });
  });

  describe("deleteSessionByToken", () => {
    it("deletes sessions matching the given token", async () => {
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 });
      await sessionRepo.deleteSessionByToken("token-abc");
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { sessionToken: "token-abc" },
      });
    });

    it("accepts a custom db instance", async () => {
      const mockDb = { session: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) } };
      await sessionRepo.deleteSessionByToken("token-abc", mockDb as Parameters<typeof sessionRepo.deleteSessionByToken>[1]);
      expect(mockDb.session.deleteMany).toHaveBeenCalled();
      expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteUserSessions", () => {
    it("deletes all sessions for the given userId", async () => {
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 2 });
      await sessionRepo.deleteUserSessions("user-1");
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  describe("createSession", () => {
    it("creates a session with token, userId and expiry", async () => {
      vi.mocked(prisma.session.create).mockResolvedValue({} as never);
      const expiresAt = new Date("2026-01-01T00:00:00Z");
      await sessionRepo.createSession("token-abc", "user-1", expiresAt);
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: { sessionToken: "token-abc", userId: "user-1", expiresAt },
      });
    });

    it("accepts a custom db instance", async () => {
      const mockDb = { session: { create: vi.fn().mockResolvedValue({}) } };
      const expiresAt = new Date();
      await sessionRepo.createSession("token-abc", "user-1", expiresAt, mockDb as Parameters<typeof sessionRepo.createSession>[3]);
      expect(mockDb.session.create).toHaveBeenCalled();
      expect(prisma.session.create).not.toHaveBeenCalled();
    });
  });
});

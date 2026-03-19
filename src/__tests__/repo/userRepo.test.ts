import { describe, it, expect, vi, beforeEach } from "vitest";
import * as userRepo from "../../repo/userRepo";
import { PROFILE_SELECT } from "../../repo/userRepo";
import { prisma } from "../../repo/db";

vi.mock("../../repo/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userTask: {
      deleteMany: vi.fn(),
    },
  },
}));

describe("userRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findUserById", () => {
    it("queries user by id with the profile select shape", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await userRepo.findUserById("user-1");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: PROFILE_SELECT,
      });
    });

    it("accepts a custom db instance", async () => {
      const mockDb = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
      await userRepo.findUserById("user-1", mockDb as Parameters<typeof userRepo.findUserById>[1]);
      expect(mockDb.user.findUnique).toHaveBeenCalled();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("upsertUserByEmail", () => {
    it("upserts a user and derives name from the email local part", async () => {
      vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);
      await userRepo.upsertUserByEmail("john@example.com");
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
        update: {},
        create: { email: "john@example.com", name: "john" },
      });
    });

    it("handles email with complex local part", async () => {
      vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);
      await userRepo.upsertUserByEmail("first.last+tag@example.com");
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ name: "first.last+tag" }),
        }),
      );
    });
  });

  describe("updateUserProfile", () => {
    it("updates user with provided data and returns the profile select shape", async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      await userRepo.updateUserProfile("user-1", { name: "New Name" });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { name: "New Name" },
        select: PROFILE_SELECT,
      });
    });
  });

  describe("deleteUserTasks", () => {
    it("deletes all userTask rows for the given user", async () => {
      vi.mocked(prisma.userTask.deleteMany).mockResolvedValue({ count: 3 });
      await userRepo.deleteUserTasks("user-1");
      expect(prisma.userTask.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  describe("deleteUser", () => {
    it("deletes the user by id", async () => {
      vi.mocked(prisma.user.delete).mockResolvedValue({} as never);
      await userRepo.deleteUser("user-1");
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    });
  });
});

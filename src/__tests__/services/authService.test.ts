import { describe, it, expect, vi, beforeEach } from "vitest";
import * as authService from "../../services/authService";
import * as userRepo from "../../repo/userRepo";
import * as sessionRepo from "../../repo/sessionRepo";
import { syncUserTaskAssignments } from "../../services/taskAssignmentService";
import { prisma } from "../../lib/prisma";

vi.mock("../../repo/userRepo", () => ({
  findUserById: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUserTasks: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("../../repo/sessionRepo", () => ({
  deleteSessionByToken: vi.fn(),
  deleteUserSessions: vi.fn(),
}));

vi.mock("../../services/taskAssignmentService", () => ({
  syncUserTaskAssignments: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn({} as never));
  });

  // ──────────────────────────────────────────────
  // getProfile
  // ──────────────────────────────────────────────

  describe("getProfile", () => {
    it("returns the user profile when found", async () => {
      const mockUser = {
        id: "user-1",
        email: "user@example.com",
        name: "User",
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED" as never,
        arrivalDate: null,
        plannedArrivalDate: null,
      };
      vi.mocked(userRepo.findUserById).mockResolvedValue(mockUser);

      const result = await authService.getProfile("user-1");

      expect(userRepo.findUserById).toHaveBeenCalledWith("user-1");
      expect(result).toEqual({ success: true, data: mockUser });
    });

    it("returns 404 when the user does not exist", async () => {
      vi.mocked(userRepo.findUserById).mockResolvedValue(null);

      const result = await authService.getProfile("nonexistent");

      expect(result).toEqual({ success: false, statusCode: 404, error: "User not found" });
    });
  });

  // ──────────────────────────────────────────────
  // updateProfile
  // ──────────────────────────────────────────────

  describe("updateProfile", () => {
    it("updates profile and syncs task assignments in a transaction", async () => {
      const updatedUser = {
        id: "user-1",
        email: "user@example.com",
        name: "Updated User",
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED" as never,
        arrivalDate: null,
        plannedArrivalDate: null,
      };
      vi.mocked(userRepo.updateUserProfile).mockResolvedValue(updatedUser);
      vi.mocked(syncUserTaskAssignments).mockResolvedValue(undefined as never);

      const result = await authService.updateProfile("user-1", { name: "Updated User" });

      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(userRepo.updateUserProfile).toHaveBeenCalledWith("user-1", { name: "Updated User" }, expect.anything());
      expect(syncUserTaskAssignments).toHaveBeenCalledWith(
        updatedUser,
        expect.objectContaining({ removeOutdatedTodoAssignments: true }),
      );
      expect(result).toEqual({ success: true, data: updatedUser });
    });

    it("propagates transaction errors (e.g. sync failure)", async () => {
      vi.mocked(userRepo.updateUserProfile).mockResolvedValue({} as never);
      vi.mocked(syncUserTaskAssignments).mockRejectedValueOnce(new Error("sync failed"));

      await expect(authService.updateProfile("user-1", {})).rejects.toThrow("sync failed");
    });
  });

  // ──────────────────────────────────────────────
  // deleteProfile
  // ──────────────────────────────────────────────

  describe("deleteProfile", () => {
    it("deletes sessions, tasks, and user inside a transaction", async () => {
      vi.mocked(sessionRepo.deleteUserSessions).mockResolvedValue({ count: 1 });
      vi.mocked(userRepo.deleteUserTasks).mockResolvedValue({ count: 3 });
      vi.mocked(userRepo.deleteUser).mockResolvedValue({} as never);

      const result = await authService.deleteProfile("user-1");

      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(sessionRepo.deleteUserSessions).toHaveBeenCalledWith("user-1", expect.anything());
      expect(userRepo.deleteUserTasks).toHaveBeenCalledWith("user-1", expect.anything());
      expect(userRepo.deleteUser).toHaveBeenCalledWith("user-1", expect.anything());
      expect(result).toEqual({ success: true });
    });
  });

  // ──────────────────────────────────────────────
  // logout
  // ──────────────────────────────────────────────

  describe("logout", () => {
    it("deletes the session token when provided", async () => {
      vi.mocked(sessionRepo.deleteSessionByToken).mockResolvedValue({ count: 1 });

      const result = await authService.logout("test-token");

      expect(sessionRepo.deleteSessionByToken).toHaveBeenCalledWith("test-token");
      expect(result).toEqual({ success: true });
    });

    it("is a no-op when no session token is provided", async () => {
      const result = await authService.logout(undefined);

      expect(sessionRepo.deleteSessionByToken).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});

import { withTransaction } from "../repo/db";
import type { UserUpdateData } from "../types/models";
import * as userRepo from "../repo/userRepo";
import * as sessionRepo from "../repo/sessionRepo";
import { syncUserTaskAssignments } from "./taskAssignmentService";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface AuthServiceResult<T = void> {
  success: boolean;
  error?: string;
  statusCode?: number;
  data?: T;
}

type UserProfile = NonNullable<Awaited<ReturnType<typeof userRepo.findUserById>>>;

// ──────────────────────────────────────────────
// Service functions
// ──────────────────────────────────────────────

/**
 * Fetches the profile for the given user.
 * Returns 404 if the user does not exist.
 */
export const getProfile = async (userId: string): Promise<AuthServiceResult<UserProfile>> => {
  const user = await userRepo.findUserById(userId);

  if (!user) {
    return { success: false, statusCode: 404, error: "User not found" };
  }

  return { success: true, data: user };
};

/**
 * Updates a user's profile fields and re-syncs task assignments.
 * Wraps both operations in a transaction for atomicity.
 */
export const updateProfile = async (
  userId: string,
  data: UserUpdateData,
): Promise<AuthServiceResult<UserProfile>> => {
  const user = await withTransaction(async (tx) => {
    const updatedUser = await userRepo.updateUserProfile(userId, data, tx);

    await syncUserTaskAssignments(updatedUser, {
      removeOutdatedTodoAssignments: true,
      db: tx,
    });

    return updatedUser;
  });

  return { success: true, data: user };
};

/**
 * Deletes a user's account along with all sessions and task assignments.
 * All three deletions are wrapped in a transaction for atomicity.
 */
export const deleteProfile = async (userId: string): Promise<AuthServiceResult<void>> => {
  await withTransaction(async (tx) => {
    await sessionRepo.deleteUserSessions(userId, tx);
    await userRepo.deleteUserTasks(userId, tx);
    await userRepo.deleteUser(userId, tx);
  });

  return { success: true };
};

/**
 * Ends the current session by removing the session token from the database.
 * A missing token is treated as a no-op (the user is already logged out).
 */
export const logout = async (sessionToken: string | undefined): Promise<AuthServiceResult<void>> => {
  if (sessionToken) {
    await sessionRepo.deleteSessionByToken(sessionToken);
  }

  return { success: true };
};

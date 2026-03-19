import { UserTaskStatus } from "../types/enums";
import { withTransaction } from "../repo/db";
import * as taskRepo from "../repo/taskRepo";
import { type CreateTaskPayload } from "../controllers/taskValidation";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface TaskServiceResult<T = void> {
  success: boolean;
  error?: string;
  statusCode?: number;
  data?: T;
}

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

/**
 * Maps raw API status strings (including legacy aliases) to UserTaskStatus enum values.
 */
const STATUS_ALIAS_MAP: Record<string, UserTaskStatus> = {
  // Canonical API values:
  not_started: UserTaskStatus.TODO,
  in_progress: UserTaskStatus.SAVED,
  completed: UserTaskStatus.DONE,
  // Backward-compatible aliases:
  todo: UserTaskStatus.TODO,
  saved: UserTaskStatus.SAVED,
  done: UserTaskStatus.DONE,
};

/**
 * Returns true when a user-created task belongs to a different user.
 * System tasks (createdByUserId === null) are always accessible.
 */
const isOwnedByAnotherUser = (createdByUserId: string | null, userId: string): boolean =>
  createdByUserId !== null && createdByUserId !== userId;

// ──────────────────────────────────────────────
// Service functions
// ──────────────────────────────────────────────

/**
 * Fetches all tasks assigned to a user, merging task fields with user-task metadata.
 */
export const getUserTasks = async (userId: string) => {
  const assignedUserTasks = await taskRepo.findUserTasksWithTask(userId);

  return assignedUserTasks.map(({ task, id, status, dueDate, personalNotes, completedAt }) => ({
    ...task,
    userTaskId: id,
    status,
    dueDate,
    personalNotes,
    completedAt,
  }));
};

/**
 * Fetches a single task by ID, enforcing visibility rules:
 * - System tasks are visible to all authenticated users.
 * - User-created tasks are only visible to their creator.
 */
export const getTaskById = async (
  taskId: string,
  userId: string,
): Promise<TaskServiceResult<Awaited<ReturnType<typeof taskRepo.findTaskById>>>> => {
  const task = await taskRepo.findTaskById(taskId);

  if (!task) {
    return { success: false, statusCode: 404, error: "Task not found" };
  }

  if (isOwnedByAnotherUser(task.createdByUserId, userId)) {
    return { success: false, statusCode: 404, error: "Task not found" };
  }

  return { success: true, data: task };
};

/**
 * Creates a new user-defined task and auto-assigns it to the creator.
 * Both operations are wrapped in a transaction for atomicity.
 */
export const createTask = async (
  payload: CreateTaskPayload,
  userId: string,
): Promise<TaskServiceResult<Awaited<ReturnType<typeof taskRepo.createTask>>>> => {
  const {
    slug,
    title,
    shortDescription,
    body,
    category,
    sortOrder,
    officialLinks,
    requiresEU,
    requiresEmploymentStatus,
    requiresChildren,
    minDaysFromArrival,
    maxDaysFromArrival,
  } = payload;

  const task = await withTransaction(async (tx) => {
    const createdTask = await taskRepo.createTask(
      {
        slug,
        title,
        shortDescription,
        body,
        category,
        sortOrder,
        officialLinks: officialLinks ?? {},
        requiresEU,
        requiresEmploymentStatus,
        requiresChildren,
        minDaysFromArrival,
        maxDaysFromArrival,
        createdByUserId: userId,
      },
      tx,
    );

    await taskRepo.createUserTaskAssignment(userId, createdTask.id, tx);

    return createdTask;
  });

  return { success: true, data: task };
};

/**
 * Updates or creates a user's task-status record.
 *
 * Accepts a raw status string and resolves it via STATUS_ALIAS_MAP.
 * Returns 400 for unrecognised status strings.
 * Returns 404 if the task does not exist or is not accessible to the user.
 */
export const updateTaskStatus = async (
  taskId: string,
  rawStatus: string,
  userId: string,
  options: { dueDate?: Date | null; personalNotes?: string | null },
): Promise<TaskServiceResult<Awaited<ReturnType<typeof taskRepo.upsertUserTaskStatus>>>> => {
  const normalizedStatus = rawStatus.trim().toLowerCase();
  const status = STATUS_ALIAS_MAP[normalizedStatus];

  if (!status) {
    return {
      success: false,
      statusCode: 400,
      error: "Invalid status. Use one of: not_started, in_progress, completed (legacy aliases: todo, saved, done)",
    };
  }

  const task = await taskRepo.findOwnedOrSystemTask(taskId, userId);

  if (!task) {
    return { success: false, statusCode: 404, error: "Task not found" };
  }

  const userTask = await taskRepo.upsertUserTaskStatus(userId, taskId, {
    status,
    personalNotes: options.personalNotes,
    completedAt: status === UserTaskStatus.DONE ? new Date() : null,
    dueDate: options.dueDate,
  });

  return { success: true, data: userTask };
};

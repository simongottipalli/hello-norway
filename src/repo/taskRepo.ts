import { UserTaskStatus } from "../generated/prisma/client.js";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma";

type TaskDb = Pick<typeof prisma, "task" | "userTask">;

export const findUserTasksWithTask = (userId: string, db: TaskDb = prisma) =>
  db.userTask.findMany({
    where: { userId },
    include: { task: true },
    orderBy: [{ task: { category: "asc" } }, { task: { sortOrder: "asc" } }],
  });

export const findTaskById = (id: string, db: TaskDb = prisma) =>
  db.task.findUnique({ where: { id } });

export const findOwnedOrSystemTask = (id: string, userId: string, db: TaskDb = prisma) =>
  db.task.findFirst({
    where: {
      id,
      OR: [
        { createdByUserId: null },
        { createdByUserId: userId },
      ],
    },
    select: { id: true },
  });

export const createTask = (data: Prisma.TaskUncheckedCreateInput, db: TaskDb = prisma) =>
  db.task.create({ data });

export const createUserTaskAssignment = (
  userId: string,
  taskId: string,
  db: TaskDb = prisma,
) =>
  db.userTask.create({
    data: { userId, taskId, status: UserTaskStatus.TODO },
  });

export const upsertUserTaskStatus = (
  userId: string,
  taskId: string,
  data: {
    status: UserTaskStatus;
    personalNotes?: string | null;
    completedAt: Date | null;
    dueDate?: Date | null;
  },
  db: TaskDb = prisma,
) =>
  db.userTask.upsert({
    where: { userId_taskId: { userId, taskId } },
    update: {
      status: data.status,
      ...(data.personalNotes !== undefined ? { personalNotes: data.personalNotes } : {}),
      completedAt: data.completedAt,
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
    },
    create: {
      userId,
      taskId,
      status: data.status,
      personalNotes: data.personalNotes ?? null,
      completedAt: data.completedAt,
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
    },
  });

export const findOnboardingPreviewTasks = (
  where: Prisma.TaskWhereInput,
  db: TaskDb = prisma,
) =>
  db.task.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      title: true,
      shortDescription: true,
      category: true,
      sortOrder: true,
    },
  });

/**
 * Returns the ownership metadata of a task so the caller can decide whether
 * the requesting user is allowed to delete it.
 */
export const findTaskOwnership = (id: string, db: TaskDb = prisma) =>
  db.task.findUnique({ where: { id }, select: { id: true, createdByUserId: true } });

/**
 * Deletes a task and all associated UserTask rows (cascade handled by DB
 * foreign-key constraint, or explicitly by the caller before invoking this).
 */
export const deleteTask = (id: string, db: TaskDb = prisma) =>
  db.task.delete({ where: { id } });

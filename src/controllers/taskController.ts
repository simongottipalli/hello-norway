import { Request, Response } from "express";
import { TaskCategory, UserTaskStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma";
import { handlePrismaError } from "../utils/errorHandler";
import { EMPLOYMENT_STATUS_VALUES } from "../lib/employmentStatus";

// Field length limits
const SLUG_MAX_LENGTH = 80;
const TITLE_MAX_LENGTH = 140;
const SHORT_DESCRIPTION_MAX_LENGTH = 280;
const BODY_MAX_LENGTH = 50000;

// sortOrder must fit in PostgreSQL SmallInt
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 32767;

const VALID_TASK_CATEGORIES = new Set<string>(Object.values(TaskCategory));
const VALID_EMPLOYMENT_STATUSES = new Set<string>(EMPLOYMENT_STATUS_VALUES);

/**
 * Fields that are allowed to be updated via PATCH /api/tasks/:id.
 * System fields (id, createdByUserId, createdAt, updatedAt) are intentionally excluded.
 */
const TASK_UPDATABLE_FIELDS = new Set([
  "slug",
  "title",
  "shortDescription",
  "body",
  "category",
  "sortOrder",
  "officialLinks",
  "requiresEU",
  "requiresEmploymentStatus",
  "requiresChildren",
  "minDaysFromArrival",
  "maxDaysFromArrival",
]);

/**
 * Validates that a value is a non-empty string within the given max length.
 * Returns an error message string on failure, or null on success.
 */
const validateStringField = (
  name: string,
  value: unknown,
  maxLength: number,
): string | null => {
  if (typeof value !== "string" || !value) {
    return `${name} must be a non-empty string`;
  }
  if (value.length > maxLength) {
    return `${name} must not exceed ${maxLength} characters`;
  }
  return null;
};

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

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { createdByUserId: null },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    req.logger.info({ msg: 'Fetched all tasks', count: tasks.length });
    res.json(tasks);
  } catch (error: unknown) {
    req.logger.error({ msg: 'Failed to fetch tasks', error });
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const getUserTasks = async (req: Request, res: Response) => {
  try {
    const assignedUserTasks = await prisma.userTask.findMany({
      where: { userId: req.user!.id },
      include: { task: true },
      orderBy: [{ task: { category: "asc" } }, { task: { sortOrder: "asc" } }],
    });

    const tasks = assignedUserTasks.map(({ task, id, status, dueDate, personalNotes, completedAt }) => ({
      ...task,
      userTaskId: id,
      status,
      dueDate,
      personalNotes,
      completedAt,
    }));

    req.logger.info({ msg: 'Fetched user tasks', count: tasks.length, userId: req.user!.id });
    res.json(tasks);
  } catch (error: unknown) {
    req.logger.error({ msg: 'Failed to fetch user tasks', error, userId: req.user?.id });
    res.status(500).json({ error: "Failed to fetch user tasks" });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      req.logger.info({ msg: 'Task not found', taskId: id });
      return res.status(404).json({ error: "Task not found" });
    }

    // User-created tasks are private — only the creator may view them
    if (isOwnedByAnotherUser(task.createdByUserId, req.user!.id)) {
      req.logger.info({ msg: 'Task not found (owned by another user)', taskId: id });
      return res.status(404).json({ error: "Task not found" });
    }

    req.logger.info({ msg: 'Fetched task by id', taskId: id });
    res.json(task);
  } catch (error: unknown) {
    const errorResponse = handlePrismaError(error, req.logger);
    if (errorResponse) {
      return res.status(errorResponse.status).json({ error: errorResponse.message });
    }
    req.logger.error({ msg: 'Failed to fetch task', error });
    res.status(500).json({ error: "Failed to fetch task" });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
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
    } = req.body;

    // Required field presence check
    if (!slug || !title || !shortDescription || !body || !category || sortOrder === undefined) {
      req.logger.info({ msg: 'Task creation failed - missing required fields' });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Type and length validation for required string fields
    const slugErr = validateStringField("slug", slug, SLUG_MAX_LENGTH);
    if (slugErr) return res.status(400).json({ error: slugErr });
    const titleErr = validateStringField("title", title, TITLE_MAX_LENGTH);
    if (titleErr) return res.status(400).json({ error: titleErr });
    const descErr = validateStringField("shortDescription", shortDescription, SHORT_DESCRIPTION_MAX_LENGTH);
    if (descErr) return res.status(400).json({ error: descErr });
    const bodyErr = validateStringField("body", body, BODY_MAX_LENGTH);
    if (bodyErr) return res.status(400).json({ error: bodyErr });

    // Category enum validation
    if (typeof category !== "string" || !VALID_TASK_CATEGORIES.has(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${[...VALID_TASK_CATEGORIES].join(", ")}` });
    }

    // sortOrder integer and range validation
    if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) ||
        sortOrder < SORT_ORDER_MIN || sortOrder > SORT_ORDER_MAX) {
      return res.status(400).json({
        error: `sortOrder must be an integer between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}`,
      });
    }

    // Optional field type validation
    if (requiresEU !== undefined && requiresEU !== null && typeof requiresEU !== "boolean") {
      return res.status(400).json({ error: "requiresEU must be a boolean or null" });
    }
    if (requiresChildren !== undefined && requiresChildren !== null && typeof requiresChildren !== "boolean") {
      return res.status(400).json({ error: "requiresChildren must be a boolean or null" });
    }
    if (requiresEmploymentStatus !== undefined && requiresEmploymentStatus !== null) {
      if (!Array.isArray(requiresEmploymentStatus) ||
          !requiresEmploymentStatus.every((s: unknown) => typeof s === "string" && VALID_EMPLOYMENT_STATUSES.has(s))) {
        return res.status(400).json({ error: "requiresEmploymentStatus must be an array of valid employment status values" });
      }
    }
    if (minDaysFromArrival !== undefined && minDaysFromArrival !== null) {
      if (typeof minDaysFromArrival !== "number" || !Number.isInteger(minDaysFromArrival) || minDaysFromArrival < 0) {
        return res.status(400).json({ error: "minDaysFromArrival must be a non-negative integer or null" });
      }
    }
    if (maxDaysFromArrival !== undefined && maxDaysFromArrival !== null) {
      if (typeof maxDaysFromArrival !== "number" || !Number.isInteger(maxDaysFromArrival) || maxDaysFromArrival < 0) {
        return res.status(400).json({ error: "maxDaysFromArrival must be a non-negative integer or null" });
      }
      if (minDaysFromArrival !== undefined && minDaysFromArrival !== null && maxDaysFromArrival < minDaysFromArrival) {
        return res.status(400).json({ error: "maxDaysFromArrival must be greater than or equal to minDaysFromArrival" });
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
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
          createdByUserId: req.user!.id,
        },
      });

      // Auto-assign the newly created task to its creator
      await tx.userTask.create({
        data: {
          userId: req.user!.id,
          taskId: createdTask.id,
          status: UserTaskStatus.TODO,
        },
      });

      return createdTask;
    });

    req.logger.info({ msg: 'Task created', taskId: task.id, slug });
    res.status(201).json(task);
  } catch (error: unknown) {
    const errorResponse = handlePrismaError(error, req.logger);
    if (errorResponse) {
      return res.status(errorResponse.status).json({ error: errorResponse.message });
    }
    req.logger.error({ msg: 'Failed to create task', error });
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = req.body;
    if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
      req.logger.info({ msg: "Task update failed - invalid request body type", taskId: id, bodyType: typeof body });
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      req.logger.info({ msg: 'Task update failed - status requires dedicated endpoint', taskId: id });
      return res.status(400).json({ error: "Use PATCH /api/tasks/:id/status to update task status" });
    }

    // Strip unknown/system fields — only allow fields in the updatable whitelist
    const updateData: Record<string, unknown> = {};
    for (const field of TASK_UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updateData[field] = (body as Record<string, unknown>)[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Per-field type validation for provided fields
    if ("slug" in updateData) {
      const slugErr = validateStringField("slug", updateData.slug, SLUG_MAX_LENGTH);
      if (slugErr) return res.status(400).json({ error: slugErr });
    }
    if ("title" in updateData) {
      const titleErr = validateStringField("title", updateData.title, TITLE_MAX_LENGTH);
      if (titleErr) return res.status(400).json({ error: titleErr });
    }
    if ("shortDescription" in updateData) {
      const descErr = validateStringField("shortDescription", updateData.shortDescription, SHORT_DESCRIPTION_MAX_LENGTH);
      if (descErr) return res.status(400).json({ error: descErr });
    }
    if ("body" in updateData) {
      const bodyErr = validateStringField("body", updateData.body, BODY_MAX_LENGTH);
      if (bodyErr) return res.status(400).json({ error: bodyErr });
    }
    if ("category" in updateData) {
      if (typeof updateData.category !== "string" || !VALID_TASK_CATEGORIES.has(updateData.category as string)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${[...VALID_TASK_CATEGORIES].join(", ")}` });
      }
    }
    if ("sortOrder" in updateData) {
      const sortOrder = updateData.sortOrder;
      if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) ||
          (sortOrder as number) < SORT_ORDER_MIN || (sortOrder as number) > SORT_ORDER_MAX) {
        return res.status(400).json({
          error: `sortOrder must be an integer between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}`,
        });
      }
    }
    if ("requiresEU" in updateData && updateData.requiresEU !== null && typeof updateData.requiresEU !== "boolean") {
      return res.status(400).json({ error: "requiresEU must be a boolean or null" });
    }
    if ("requiresChildren" in updateData && updateData.requiresChildren !== null && typeof updateData.requiresChildren !== "boolean") {
      return res.status(400).json({ error: "requiresChildren must be a boolean or null" });
    }
    if ("requiresEmploymentStatus" in updateData && updateData.requiresEmploymentStatus !== null) {
      const statusArray = updateData.requiresEmploymentStatus;
      if (!Array.isArray(statusArray) || !(statusArray as unknown[]).every((s) => typeof s === "string" && VALID_EMPLOYMENT_STATUSES.has(s as string))) {
        return res.status(400).json({ error: "requiresEmploymentStatus must be an array of valid employment status values" });
      }
    }
    if ("minDaysFromArrival" in updateData && updateData.minDaysFromArrival !== null) {
      const minDays = updateData.minDaysFromArrival;
      if (typeof minDays !== "number" || !Number.isInteger(minDays) || (minDays as number) < 0) {
        return res.status(400).json({ error: "minDaysFromArrival must be a non-negative integer or null" });
      }
    }
    if ("maxDaysFromArrival" in updateData && updateData.maxDaysFromArrival !== null) {
      const maxDays = updateData.maxDaysFromArrival;
      if (typeof maxDays !== "number" || !Number.isInteger(maxDays) || (maxDays as number) < 0) {
        return res.status(400).json({ error: "maxDaysFromArrival must be a non-negative integer or null" });
      }
      const minDays = updateData.minDaysFromArrival;
      if (minDays !== undefined && minDays !== null && (maxDays as number) < (minDays as number)) {
        return res.status(400).json({ error: "maxDaysFromArrival must be greater than or equal to minDaysFromArrival" });
      }
    }

    const existing = await prisma.task.findUnique({
      where: { id },
      select: { createdByUserId: true, minDaysFromArrival: true, maxDaysFromArrival: true },
    });

    if (!existing) {
      req.logger.info({ msg: 'Task not found', taskId: id });
      return res.status(404).json({ error: "Task not found" });
    }

    // User-created tasks may only be edited by their creator
    if (isOwnedByAnotherUser(existing.createdByUserId, req.user!.id)) {
      req.logger.info({ msg: 'Task update denied - owned by another user', taskId: id });
      return res.status(404).json({ error: "Task not found" });
    }

    // Cross-field range check using existing DB values when only one bound is updated
    const effectiveMin = "minDaysFromArrival" in updateData
      ? (updateData.minDaysFromArrival as number | null)
      : existing.minDaysFromArrival;
    const effectiveMax = "maxDaysFromArrival" in updateData
      ? (updateData.maxDaysFromArrival as number | null)
      : existing.maxDaysFromArrival;
    if (effectiveMin !== null && effectiveMax !== null &&
        effectiveMin !== undefined && effectiveMax !== undefined &&
        effectiveMax < effectiveMin) {
      return res.status(400).json({ error: "maxDaysFromArrival must be greater than or equal to minDaysFromArrival" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    req.logger.info({ msg: 'Task updated', taskId: id });
    res.json(task);
  } catch (error: unknown) {
    const errorResponse = handlePrismaError(error, req.logger);
    if (errorResponse) {
      return res.status(errorResponse.status).json({ error: errorResponse.message });
    }
    req.logger.error({ msg: 'Failed to update task', error });
    res.status(500).json({ error: "Failed to update task" });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rawStatus = req.body?.status;
    const rawDueDate = req.body?.dueDate;
    const rawPersonalNotes = req.body?.personalNotes;

    if (typeof rawStatus !== "string") {
      req.logger.info({ msg: 'Task status update failed - invalid status type', taskId: id, status: rawStatus });
      return res.status(400).json({ error: "Invalid status. 'status' must be a string value" });
    }

    const normalizedStatus = rawStatus.trim().toLowerCase();
    const mappedStatus = STATUS_ALIAS_MAP[normalizedStatus];

    if (!mappedStatus) {
      req.logger.info({ msg: 'Task status update failed - invalid status', taskId: id, status: rawStatus });
      return res
        .status(400)
        .json({
          error:
            "Invalid status. Use one of: not_started, in_progress, completed (legacy aliases: todo, saved, done)",
        });
    }
    const status = mappedStatus;
    let dueDate: Date | null | undefined;

    if (rawDueDate !== undefined) {
      if (rawDueDate === null) {
        dueDate = null;
      } else if (typeof rawDueDate === "string") {
        const dueDateMatch = rawDueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!dueDateMatch) {
          req.logger.info({ msg: 'Task status update failed - invalid due date', taskId: id, dueDate: rawDueDate });
          return res.status(400).json({ error: "Invalid dueDate. Must be a valid date string or null" });
        }

        const [, yearRaw, monthRaw, dayRaw] = dueDateMatch;
        const year = Number(yearRaw);
        const month = Number(monthRaw);
        const day = Number(dayRaw);
        const parsedDueDate = new Date(Date.UTC(year, month - 1, day));
        if (
          parsedDueDate.getUTCFullYear() !== year ||
          parsedDueDate.getUTCMonth() !== month - 1 ||
          parsedDueDate.getUTCDate() !== day
        ) {
          req.logger.info({ msg: 'Task status update failed - invalid due date', taskId: id, dueDate: rawDueDate });
          return res.status(400).json({ error: "Invalid dueDate. Must be a valid date string or null" });
        }

        dueDate = parsedDueDate;
      } else {
        req.logger.info({ msg: 'Task status update failed - invalid due date type', taskId: id, dueDate: rawDueDate });
        return res.status(400).json({ error: "Invalid dueDate. Must be a valid date string or null" });
      }
    }

    if (rawPersonalNotes !== undefined && rawPersonalNotes !== null && typeof rawPersonalNotes !== "string") {
      req.logger.info({ msg: 'Task status update failed - invalid personal notes type', taskId: id });
      return res.status(400).json({ error: "Invalid personalNotes. 'personalNotes' must be a string or null" });
    }

    const task = await prisma.task.findFirst({
      where: {
        id,
        OR: [
          { createdByUserId: null },
          { createdByUserId: req.user!.id },
        ],
      },
      select: { id: true },
    });

    if (!task) {
      req.logger.info({ msg: 'Task not found', taskId: id });
      return res.status(404).json({ error: "Task not found" });
    }

    const userTask = await prisma.userTask.upsert({
      where: {
        userId_taskId: {
          userId: req.user!.id,
          taskId: id,
        },
      },
      update: {
        status,
        ...(rawPersonalNotes !== undefined ? { personalNotes: rawPersonalNotes } : {}),
        completedAt: status === UserTaskStatus.DONE ? new Date() : null,
        ...(dueDate !== undefined ? { dueDate } : {}),
      },
      create: {
        userId: req.user!.id,
        taskId: id,
        status,
        personalNotes: rawPersonalNotes ?? null,
        completedAt: status === UserTaskStatus.DONE ? new Date() : null,
        ...(dueDate !== undefined ? { dueDate } : {}),
      },
    });

    req.logger.info({ msg: 'User task status updated', taskId: id, status, userId: req.user!.id });
    return res.json(userTask);
  } catch (error: unknown) {
    const errorResponse = handlePrismaError(error, req.logger);
    if (errorResponse) {
      return res.status(errorResponse.status).json({ error: errorResponse.message });
    }
    req.logger.error({ msg: 'Failed to update task status', error });
    res.status(500).json({ error: "Failed to update task status" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existing = await prisma.task.findUnique({
      where: { id },
      select: { createdByUserId: true },
    });

    if (!existing) {
      req.logger.info({ msg: 'Task not found', taskId: id });
      return res.status(404).json({ error: "Task not found" });
    }

    // User-created tasks may only be deleted by their creator
    if (isOwnedByAnotherUser(existing.createdByUserId, req.user!.id)) {
      req.logger.info({ msg: 'Task deletion denied - owned by another user', taskId: id });
      // Return 404 to avoid disclosing existence of tasks owned by other users
      return res.status(404).json({ error: "Task not found" });
    }

    await prisma.task.delete({
      where: { id },
    });

    req.logger.info({ msg: 'Task deleted', taskId: id });
    res.status(204).send();
  } catch (error: unknown) {
    const errorResponse = handlePrismaError(error, req.logger);
    if (errorResponse) {
      return res.status(errorResponse.status).json({ error: errorResponse.message });
    }
    req.logger.error({ msg: 'Failed to delete task', error });
    res.status(500).json({ error: "Failed to delete task" });
  }
};

import { Request, Response } from "express";
import { UserTaskStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma";
import { handlePrismaError } from "../utils/errorHandler";
import {
  validateCreateTaskBody,
  validateUpdateTaskFields,
  validateDaysFromArrivalRange,
} from "./taskValidation";
import * as taskRepo from "../repo/taskRepo";

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
    const tasks = await taskRepo.findAllSystemTasks();

    req.logger.info({ msg: 'Fetched all tasks', count: tasks.length });
    res.json(tasks);
  } catch (error: unknown) {
    req.logger.error({ msg: 'Failed to fetch tasks', error });
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const getUserTasks = async (req: Request, res: Response) => {
  try {
    const assignedUserTasks = await taskRepo.findUserTasksWithTask(req.user!.id);

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

    const task = await taskRepo.findTaskById(id);

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
    const validation = validateCreateTaskBody(req.body);
    if ("error" in validation) {
      req.logger.info({ msg: 'Task creation failed - validation error', error: validation.error });
      return res.status(400).json({ error: validation.error });
    }

    const {
      slug, title, shortDescription, body, category, sortOrder,
      officialLinks, requiresEU, requiresEmploymentStatus, requiresChildren,
      minDaysFromArrival, maxDaysFromArrival,
    } = validation.data;

    const task = await prisma.$transaction(async (tx) => {
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
          createdByUserId: req.user!.id,
        },
        tx,
      );

      // Auto-assign the newly created task to its creator
      await taskRepo.createUserTaskAssignment(req.user!.id, createdTask.id, tx);

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

    // Reject attempts to use the status field (dedicated endpoint exists)
    if (
      req.body !== null &&
      req.body !== undefined &&
      typeof req.body === "object" &&
      Object.prototype.hasOwnProperty.call(req.body, "status")
    ) {
      req.logger.info({ msg: 'Task update failed - status requires dedicated endpoint', taskId: id });
      return res.status(400).json({ error: "Use PATCH /api/tasks/:id/status to update task status" });
    }

    const validation = validateUpdateTaskFields(req.body);
    if ("error" in validation) {
      req.logger.info({ msg: 'Task update failed - validation error', taskId: id, error: validation.error });
      return res.status(400).json({ error: validation.error });
    }

    const updateData = validation.data;

    const existing = await taskRepo.findTaskOwnership(id);

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
    const rangeError = validateDaysFromArrivalRange(
      updateData,
      existing.minDaysFromArrival,
      existing.maxDaysFromArrival,
    );
    if (rangeError) {
      return res.status(400).json({ error: rangeError });
    }

    const task = await taskRepo.updateTask(id, updateData);

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

    const task = await taskRepo.findOwnedOrSystemTask(id, req.user!.id);

    if (!task) {
      req.logger.info({ msg: 'Task not found', taskId: id });
      return res.status(404).json({ error: "Task not found" });
    }

    const userTask = await taskRepo.upsertUserTaskStatus(
      req.user!.id,
      id,
      {
        status,
        personalNotes: rawPersonalNotes,
        completedAt: status === UserTaskStatus.DONE ? new Date() : null,
        dueDate,
      },
    );

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

    const existing = await taskRepo.findTaskOwnership(id);

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

    await taskRepo.deleteTask(id);

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

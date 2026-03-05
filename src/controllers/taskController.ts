import { Request, Response } from "express";
import { UserTaskStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma";
import { handlePrismaError } from "../utils/errorHandler";

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

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
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

    if (!slug || !title || !shortDescription || !body || !category || sortOrder === undefined) {
      req.logger.info({ msg: 'Task creation failed - missing required fields' });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const task = await prisma.task.create({
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
      },
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
    if ("status" in (req.body || {})) {
      req.logger.info({ msg: 'Task update failed - status requires dedicated endpoint', taskId: id });
      return res.status(400).json({ error: "Use PATCH /api/tasks/:id/status to update task status" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: req.body,
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

    const task = await prisma.task.findUnique({
      where: { id },
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

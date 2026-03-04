import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { handlePrismaError } from "../utils/errorHandler";

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    let tasks;

    if (req.user?.id) {
      const assignedUserTasks = await prisma.userTask.findMany({
        where: { userId: req.user.id },
        include: { task: true },
        orderBy: [{ task: { category: "asc" } }, { task: { sortOrder: "asc" } }],
      });

      tasks = assignedUserTasks.length
        ? assignedUserTasks
            .map(({ task, id, status, dueDate, personalNotes, completedAt }) => ({
              ...task,
              userTaskId: id,
              status,
              dueDate,
              personalNotes,
              completedAt,
            }))
        : null;
    }

    if (!tasks) {
      tasks = await prisma.task.findMany({
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      });
    }

    req.logger.info({ msg: 'Fetched all tasks', count: tasks.length });
    res.json(tasks);
  } catch (error: unknown) {
    req.logger.error({ msg: 'Failed to fetch tasks', error });
    res.status(500).json({ error: "Failed to fetch tasks" });
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
    const updateData = req.body;

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

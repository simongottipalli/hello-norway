import { Request, Response } from "express";
import { handlePrismaError } from "../utils/errorHandler";
import {
  validateCreateTaskBody,
  validateUpdateTaskFields,
} from "./taskValidation";
import * as taskService from "../services/taskService";
import { parseDateOnly } from "../lib/dateUtils";

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await taskService.getAllTasks();

    req.logger.info({ msg: 'Fetched all tasks', count: tasks.length });
    res.json(tasks);
  } catch (error: unknown) {
    req.logger.error({ msg: 'Failed to fetch tasks', error });
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const getUserTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await taskService.getUserTasks(req.user!.id);

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

    const result = await taskService.getTaskById(id, req.user!.id);

    if (!result.success) {
      req.logger.info({ msg: 'Task not found', taskId: id });
      return res.status(result.statusCode ?? 404).json({ error: result.error });
    }

    req.logger.info({ msg: 'Fetched task by id', taskId: id });
    res.json(result.data);
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

    const result = await taskService.createTask(validation.data, req.user!.id);

    if (!result.success) {
      req.logger.error({ msg: 'Task creation failed', error: result.error });
      return res.status(result.statusCode ?? 500).json({ error: result.error });
    }

    req.logger.info({ msg: 'Task created', taskId: result.data!.id, slug: validation.data.slug });
    res.status(201).json(result.data);
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

    const result = await taskService.updateTask(id, validation.data, req.user!.id);

    if (!result.success) {
      req.logger.info({ msg: 'Task update failed', taskId: id, error: result.error });
      return res.status(result.statusCode ?? 500).json({ error: result.error });
    }

    req.logger.info({ msg: 'Task updated', taskId: id });
    res.json(result.data);
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

    let dueDate: Date | null | undefined;

    if (rawDueDate !== undefined) {
      const parsedDueDate = parseDateOnly(rawDueDate);
      if (parsedDueDate === undefined) {
        req.logger.info({ msg: 'Task status update failed - invalid due date', taskId: id, dueDate: rawDueDate });
        return res.status(400).json({ error: "Invalid dueDate. Must be a valid date string or null" });
      }
      dueDate = parsedDueDate;
    }

    if (rawPersonalNotes !== undefined && rawPersonalNotes !== null && typeof rawPersonalNotes !== "string") {
      req.logger.info({ msg: 'Task status update failed - invalid personal notes type', taskId: id });
      return res.status(400).json({ error: "Invalid personalNotes. 'personalNotes' must be a string or null" });
    }

    const result = await taskService.updateTaskStatus(id, rawStatus, req.user!.id, {
      dueDate,
      personalNotes: rawPersonalNotes,
    });

    if (!result.success) {
      req.logger.info({ msg: 'Task status update failed', taskId: id, error: result.error });
      return res.status(result.statusCode ?? 500).json({ error: result.error });
    }

    req.logger.info({ msg: 'User task status updated', taskId: id, userId: req.user!.id });
    return res.json(result.data);
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

    const result = await taskService.deleteTask(id, req.user!.id);

    if (!result.success) {
      req.logger.info({ msg: 'Task not found or deletion denied', taskId: id });
      return res.status(result.statusCode ?? 404).json({ error: result.error });
    }

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

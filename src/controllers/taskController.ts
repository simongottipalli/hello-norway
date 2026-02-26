import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { handlePrismaError } from "../utils/errorHandler";

export const getAllTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
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

    res.status(201).json(task);
  } catch (error: any) {
    const errorResponse = handlePrismaError(error);
    if (errorResponse) {
      return res.status(errorResponse.status).json({ error: errorResponse.message });
    }
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    res.json(task);
  } catch (error: any) {
    const errorResponse = handlePrismaError(error);
    if (errorResponse) {
      return res.status(errorResponse.status).json({ error: errorResponse.message });
    }
    res.status(500).json({ error: "Failed to update task" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    const errorResponse = handlePrismaError(error);
    if (errorResponse) {
      return res.status(errorResponse.status).json({ error: errorResponse.message });
    }
    res.status(500).json({ error: "Failed to delete task" });
  }
};

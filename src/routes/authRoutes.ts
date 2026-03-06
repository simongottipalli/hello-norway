import { Router } from "express";
import { EmploymentStatus } from "../generated/prisma/client.js";
import { authenticateSession } from "../middleware/authMiddleware";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { getRelevantTaskWhere, syncUserTaskAssignments } from "../services/taskAssignmentService";

const router = Router();
const EMPLOYMENT_STATUSES = new Set<string>(Object.values(EmploymentStatus));

const parseDateOnly = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }
  return parsed;
};

router.post("/onboarding/tasks", async (req, res) => {
  const { isEU, employmentStatus, hasChildren, arrivalDate, plannedArrivalDate } = req.body ?? {};

  if (isEU !== undefined && isEU !== null && typeof isEU !== "boolean") {
    return res.status(400).json({ error: "Invalid isEU. Must be boolean or null." });
  }

  if (hasChildren !== undefined && hasChildren !== null && typeof hasChildren !== "boolean") {
    return res.status(400).json({ error: "Invalid hasChildren. Must be boolean or null." });
  }

  if (employmentStatus !== undefined && employmentStatus !== null) {
    if (typeof employmentStatus !== "string" || !EMPLOYMENT_STATUSES.has(employmentStatus)) {
      return res.status(400).json({ error: "Invalid employmentStatus." });
    }
  }

  const parsedArrivalDate = parseDateOnly(arrivalDate);
  if (arrivalDate !== undefined && parsedArrivalDate === undefined) {
    return res.status(400).json({ error: "Invalid arrivalDate. Must be YYYY-MM-DD or null." });
  }

  const parsedPlannedArrivalDate = parseDateOnly(plannedArrivalDate);
  if (plannedArrivalDate !== undefined && parsedPlannedArrivalDate === undefined) {
    return res.status(400).json({ error: "Invalid plannedArrivalDate. Must be YYYY-MM-DD or null." });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: getRelevantTaskWhere(
        {
          id: "onboarding-preview",
          isEU: isEU ?? null,
          hasChildren: hasChildren ?? null,
          employmentStatus: employmentStatus ?? null,
          arrivalDate: parsedArrivalDate ?? null,
          plannedArrivalDate: parsedPlannedArrivalDate ?? null,
        },
        new Date(),
      ),
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        title: true,
        shortDescription: true,
        category: true,
        sortOrder: true,
      },
    });

    return res.status(200).json(tasks);
  } catch (error: unknown) {
    logger.error({ err: error, msg: "Failed to fetch onboarding task preview" });
    return res.status(500).json({ error: "Failed to fetch onboarding tasks" });
  }
});

router.get("/auth/session", authenticateSession, (req, res) => {
  return res.status(200).json({
    authenticated: true,
    user: req.user,
    session: {
      expiresAt: req.session?.expiresAt,
    },
  });
});

router.patch("/auth/profile", authenticateSession, async (req, res) => {
  const { isEU, hasChildren, employmentStatus, arrivalDate, plannedArrivalDate } = req.body ?? {};

  if (isEU !== undefined && isEU !== null && typeof isEU !== "boolean") {
    return res.status(400).json({ error: "Invalid isEU. Must be boolean or null." });
  }

  if (hasChildren !== undefined && hasChildren !== null && typeof hasChildren !== "boolean") {
    return res.status(400).json({ error: "Invalid hasChildren. Must be boolean or null." });
  }

  if (employmentStatus !== undefined && employmentStatus !== null) {
    if (typeof employmentStatus !== "string" || !EMPLOYMENT_STATUSES.has(employmentStatus)) {
      return res.status(400).json({ error: "Invalid employmentStatus." });
    }
  }

  const parsedArrivalDate = parseDateOnly(arrivalDate);
  if (arrivalDate !== undefined && parsedArrivalDate === undefined) {
    return res.status(400).json({ error: "Invalid arrivalDate. Must be YYYY-MM-DD or null." });
  }

  const parsedPlannedArrivalDate = parseDateOnly(plannedArrivalDate);
  if (plannedArrivalDate !== undefined && parsedPlannedArrivalDate === undefined) {
    return res.status(400).json({ error: "Invalid plannedArrivalDate. Must be YYYY-MM-DD or null." });
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: req.user!.id },
        data: {
          ...(isEU !== undefined ? { isEU } : {}),
          ...(hasChildren !== undefined ? { hasChildren } : {}),
          ...(employmentStatus !== undefined ? { employmentStatus } : {}),
          ...(arrivalDate !== undefined ? { arrivalDate: parsedArrivalDate } : {}),
          ...(plannedArrivalDate !== undefined ? { plannedArrivalDate: parsedPlannedArrivalDate } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          isEU: true,
          hasChildren: true,
          employmentStatus: true,
          arrivalDate: true,
          plannedArrivalDate: true,
        },
      });

      await syncUserTaskAssignments(user, {
        removeOutdatedTodoAssignments: true,
        db: tx,
      });

      return user;
    });

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (error: unknown) {
    logger.error({ err: error, userId: req.user!.id, msg: "Failed to update profile" });
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const sessionToken = req.cookies.session_token;

  try {
    if (sessionToken) {
      await prisma.session.deleteMany({ where: { sessionToken } });
    }

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    logger.error({ err: error, sessionToken, msg: "Failed to logout user session" });
    return res.status(500).json({ error: "Failed to logout" });
  }
});

export default router;

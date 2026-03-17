import { Router } from "express";
import type { EmploymentStatus } from "../generated/prisma/client.js";
import { authenticateSession } from "../middleware/authMiddleware";
import { logger } from "../lib/logger";
import { EMPLOYMENT_STATUS_VALUES } from "../lib/employmentStatus";
import * as authService from "../services/authService";
import * as onboardingService from "../services/onboardingService";

const router = Router();
const EMPLOYMENT_STATUSES = new Set<string>(EMPLOYMENT_STATUS_VALUES);

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

type OnboardingProfilePayload = {
  isEU: boolean | null;
  hasChildren: boolean | null;
  employmentStatus: EmploymentStatus | null;
  arrivalDate: Date | null;
  plannedArrivalDate: Date | null;
};

type OnboardingProfileParseResult =
  | { value: OnboardingProfilePayload; error?: undefined }
  | { value?: undefined; error: { status: number; body: unknown } };

const parseOnboardingProfilePayload = (body: unknown): OnboardingProfileParseResult => {
  const payload = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const {
    isEU,
    employmentStatus,
    hasChildren,
    arrivalDate,
    plannedArrivalDate,
  } = payload;

  if (isEU !== undefined && isEU !== null && typeof isEU !== "boolean") {
    return {
      error: { status: 400, body: { error: "Invalid isEU. Must be boolean or null." } },
    };
  }

  if (hasChildren !== undefined && hasChildren !== null && typeof hasChildren !== "boolean") {
    return {
      error: { status: 400, body: { error: "Invalid hasChildren. Must be boolean or null." } },
    };
  }

  if (employmentStatus !== undefined && employmentStatus !== null) {
    if (typeof employmentStatus !== "string" || !EMPLOYMENT_STATUSES.has(employmentStatus)) {
      return {
        error: { status: 400, body: { error: "Invalid employmentStatus." } },
      };
    }
  }

  const parsedArrivalDate = parseDateOnly(arrivalDate);
  if (arrivalDate !== undefined && parsedArrivalDate === undefined) {
    return {
      error: {
        status: 400,
        body: { error: "Invalid arrivalDate. Must be YYYY-MM-DD or null." },
      },
    };
  }

  const parsedPlannedArrivalDate = parseDateOnly(plannedArrivalDate);
  if (plannedArrivalDate !== undefined && parsedPlannedArrivalDate === undefined) {
    return {
      error: {
        status: 400,
        body: { error: "Invalid plannedArrivalDate. Must be YYYY-MM-DD or null." },
      },
    };
  }

  return {
    value: {
      isEU: (isEU ?? null) as boolean | null,
      hasChildren: (hasChildren ?? null) as boolean | null,
      employmentStatus: (employmentStatus ?? null) as EmploymentStatus | null,
      arrivalDate: parsedArrivalDate ?? null,
      plannedArrivalDate: parsedPlannedArrivalDate ?? null,
    },
  };
};

router.post("/onboarding/tasks", async (req, res) => {
  const parsed = parseOnboardingProfilePayload(req.body);
  if (parsed.error) {
    return res.status(parsed.error.status).json(parsed.error.body);
  }

  try {
    const tasks = await onboardingService.getTaskPreview(parsed.value);

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

router.get("/auth/profile", authenticateSession, async (req, res) => {
  try {
    const result = await authService.getProfile(req.user!.id);

    if (!result.success) {
      return res.status(result.statusCode ?? 404).json({ error: result.error });
    }

    return res.status(200).json({ user: result.data });
  } catch (error: unknown) {
    logger.error({ err: error, userId: req.user!.id, msg: "Failed to fetch profile" });
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.patch("/auth/profile", authenticateSession, async (req, res) => {
  const { name, isEU, hasChildren, employmentStatus, arrivalDate, plannedArrivalDate } = req.body ?? {};

  if (name !== undefined) {
    if (typeof name !== "string") {
      return res.status(400).json({ error: "Invalid name. Must be a string." });
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ error: "Invalid name. Must not be empty." });
    }
    if (trimmedName.length > 255) {
      return res.status(400).json({ error: "Invalid name. Maximum length is 255 characters." });
    }
  }

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
    const result = await authService.updateProfile(req.user!.id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(isEU !== undefined ? { isEU } : {}),
      ...(hasChildren !== undefined ? { hasChildren } : {}),
      ...(employmentStatus !== undefined ? { employmentStatus } : {}),
      ...(arrivalDate !== undefined ? { arrivalDate: parsedArrivalDate } : {}),
      ...(plannedArrivalDate !== undefined ? { plannedArrivalDate: parsedPlannedArrivalDate } : {}),
    });

    return res.status(200).json({ success: true, user: result.data });
  } catch (error: unknown) {
    logger.error({ err: error, userId: req.user!.id, msg: "Failed to update profile" });
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const sessionToken = req.cookies.session_token;

  try {
    await authService.logout(sessionToken);

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    logger.error({ err: error, sessionToken, msg: "Failed to logout user session" });
    return res.status(500).json({ error: "Failed to logout" });
  }
});

router.delete("/auth/profile", authenticateSession, async (req, res) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;

  try {
    await authService.deleteProfile(userId);

    logger.info({ userId, email: userEmail, msg: "User profile deleted successfully" });
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    logger.error({ err: error, userId, msg: "Failed to delete profile" });
    return res.status(500).json({ error: "Failed to delete profile" });
  }
});

export default router;

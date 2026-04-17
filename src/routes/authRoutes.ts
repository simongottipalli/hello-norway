import { Router } from "express";
import { EmploymentStatus, EMPLOYMENT_STATUS_VALUES } from "../types/enums";
import { authenticateSession } from "../middleware/authMiddleware";
import { logger } from "../lib/logger";
import { parseDateOnly } from "../lib/dateUtils";
import * as authService from "../services/authService";

const router = Router();
const EMPLOYMENT_STATUSES = new Set<string>(EMPLOYMENT_STATUS_VALUES);

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
  const body = req.body ?? {};
  const { name } = body;

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

  const parsed = parseOnboardingProfilePayload(body);
  if (parsed.error) {
    return res.status(parsed.error.status).json(parsed.error.body);
  }

  const { isEU, hasChildren, employmentStatus, arrivalDate, plannedArrivalDate } = parsed.value;

  try {
    const result = await authService.updateProfile(req.user!.id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...("isEU" in body ? { isEU } : {}),
      ...("hasChildren" in body ? { hasChildren } : {}),
      ...("employmentStatus" in body ? { employmentStatus } : {}),
      ...("arrivalDate" in body ? { arrivalDate } : {}),
      ...("plannedArrivalDate" in body ? { plannedArrivalDate } : {}),
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

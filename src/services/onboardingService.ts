import { EmploymentStatus } from "../types/enums";
import * as taskRepo from "../repo/taskRepo";
import { getRelevantTaskWhere } from "../repo/taskAssignmentRepo";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface OnboardingProfile {
  isEU: boolean | null;
  hasChildren: boolean | null;
  employmentStatus: EmploymentStatus | null;
  arrivalDate: Date | null;
  plannedArrivalDate: Date | null;
}

// ──────────────────────────────────────────────
// Service functions
// ──────────────────────────────────────────────

/**
 * Returns a preview list of tasks relevant to the given onboarding profile.
 * Used on the onboarding flow before a user account is created.
 */
export const getTaskPreview = (profile: OnboardingProfile) =>
  taskRepo.findOnboardingPreviewTasks(
    getRelevantTaskWhere(
      { id: "onboarding-preview", ...profile },
      new Date(),
    ),
  );

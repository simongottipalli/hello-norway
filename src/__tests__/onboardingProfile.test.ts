import { describe, expect, it } from "vitest";
import {
  buildFallbackTaskPreview,
  deriveTaskProfileFromOnboardingAnswers,
  sanitizeStoredOnboardingProfileForPatch,
} from "../lib/onboardingProfile";

describe("deriveTaskProfileFromOnboardingAnswers", () => {
  it("maps EU/EEA contexts and student answers", () => {
    const profile = deriveTaskProfileFromOnboardingAnswers({
      applyingFrom: "France",
      citizenships: "India, France",
      applyingAs: "Student",
      age: "24",
    });

    expect(profile).toEqual({
      isEU: true,
      hasChildren: null,
      employmentStatus: "STUDENT",
      arrivalDate: null,
      plannedArrivalDate: null,
    });
  });

  it("maps skilled worker without a job offer to unemployed", () => {
    const profile = deriveTaskProfileFromOnboardingAnswers({
      applyingFrom: "India",
      citizenships: "India",
      applyingAs: "Skilled worker",
      jobOffer: "No",
      age: "31",
    });

    expect(profile.isEU).toBe(false);
    expect(profile.employmentStatus).toBe("UNEMPLOYED");
  });

  it("maps other onboarding paths to OTHER employment status", () => {
    const profile = deriveTaskProfileFromOnboardingAnswers({
      applyingFrom: "United States",
      citizenships: "United States",
      applyingAs: "Family reunification",
      age: "29",
    });

    expect(profile.isEU).toBe(false);
    expect(profile.employmentStatus).toBe("OTHER");
  });

  it("builds a fallback task preview for non-EU applicants", () => {
    const tasks = buildFallbackTaskPreview({
      isEU: false,
      hasChildren: null,
      employmentStatus: "UNEMPLOYED",
      arrivalDate: null,
      plannedArrivalDate: null,
    });

    expect(tasks.length).toBeGreaterThanOrEqual(4);
    expect(tasks[0]?.title).toContain("residence permit");
  });
});

describe("sanitizeStoredOnboardingProfileForPatch", () => {
  it("omits null, unknown, and invalid values", () => {
    const payload = sanitizeStoredOnboardingProfileForPatch(
      JSON.stringify({
        isEU: true,
        hasChildren: null,
        employmentStatus: "NOT_VALID",
        arrivalDate: "2026/01/30",
        plannedArrivalDate: null,
        unknownKey: "value",
      }),
    );

    expect(payload).toEqual({ isEU: true });
  });

  it("returns valid non-null fields only", () => {
    const payload = sanitizeStoredOnboardingProfileForPatch(
      JSON.stringify({
        isEU: false,
        hasChildren: true,
        employmentStatus: "EMPLOYED",
        arrivalDate: "2026-03-01",
        plannedArrivalDate: "2026-03-10",
      }),
    );

    expect(payload).toEqual({
      isEU: false,
      hasChildren: true,
      employmentStatus: "EMPLOYED",
      arrivalDate: "2026-03-01",
      plannedArrivalDate: "2026-03-10",
    });
  });

  it("returns null when json is invalid or has no valid fields", () => {
    expect(sanitizeStoredOnboardingProfileForPatch("{")).toBeNull();
    expect(
      sanitizeStoredOnboardingProfileForPatch(
        JSON.stringify({
          isEU: null,
          hasChildren: null,
          employmentStatus: null,
          arrivalDate: null,
          plannedArrivalDate: null,
        }),
      ),
    ).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as onboardingService from "../../services/onboardingService";
import * as taskRepo from "../../repo/taskRepo";
import { getRelevantTaskWhere } from "../../services/taskAssignmentService";

vi.mock("../../repo/taskRepo", () => ({
  findOnboardingPreviewTasks: vi.fn(),
}));

vi.mock("../../services/taskAssignmentService", () => ({
  getRelevantTaskWhere: vi.fn(),
}));

describe("onboardingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTaskPreview", () => {
    it("delegates to taskRepo using a where clause from getRelevantTaskWhere", async () => {
      const mockWhere = { AND: [{ createdByUserId: null }] };
      const mockTasks = [
        { id: "task-1", title: "Register", shortDescription: "Short", category: "ARRIVAL", sortOrder: 1 },
      ];
      vi.mocked(getRelevantTaskWhere).mockReturnValue(mockWhere as never);
      vi.mocked(taskRepo.findOnboardingPreviewTasks).mockResolvedValue(mockTasks as never);

      const profile = {
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED" as never,
        arrivalDate: new Date("2026-03-01T00:00:00Z"),
        plannedArrivalDate: null,
      };

      const result = await onboardingService.getTaskPreview(profile);

      expect(getRelevantTaskWhere).toHaveBeenCalledWith(
        expect.objectContaining({ id: "onboarding-preview", ...profile }),
        expect.any(Date),
      );
      expect(taskRepo.findOnboardingPreviewTasks).toHaveBeenCalledWith(mockWhere);
      expect(result).toEqual(mockTasks);
    });

    it("returns an empty array when no tasks match the profile", async () => {
      vi.mocked(getRelevantTaskWhere).mockReturnValue({} as never);
      vi.mocked(taskRepo.findOnboardingPreviewTasks).mockResolvedValue([]);

      const result = await onboardingService.getTaskPreview({
        isEU: null,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      expect(result).toEqual([]);
    });
  });
});

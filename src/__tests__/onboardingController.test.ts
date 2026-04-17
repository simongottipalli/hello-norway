import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { RegisterRoutes } from "../generated/routes";
import { tsoaErrorHandler } from "../middleware/tsoaErrorHandler";
import { errorLogger } from "../middleware/errorLogger";
import { requestLogger } from "../middleware/requestLogger";
import * as taskRepo from "../repo/taskRepo";
import { getRelevantTaskWhere } from "../repo/taskAssignmentRepo";

vi.mock("../repo/taskRepo", () => ({
  findOnboardingPreviewTasks: vi.fn(),
}));

vi.mock("../repo/taskAssignmentRepo", () => ({
  getRelevantTaskWhere: vi.fn(),
}));

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  RegisterRoutes(app);
  app.use(tsoaErrorHandler);
  app.use(errorLogger);
  return app;
};

describe("POST /api/onboarding/tasks", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRelevantTaskWhere).mockReturnValue({ mockedWhere: true } as never);
    vi.mocked(taskRepo.findOnboardingPreviewTasks).mockResolvedValue([]);
    app = createTestApp();
  });

  it("returns 422 when boolean fields have invalid types", async () => {
    const invalidIsEU = await request(app)
      .post("/api/onboarding/tasks")
      .send({ isEU: "yes" })
      .set("Content-Type", "application/json");
    expect(invalidIsEU.status).toBe(422);
    expect(invalidIsEU.body.message).toBe("Validation Failed");
    expect(invalidIsEU.body.details).toBeDefined();

    const invalidChildren = await request(app)
      .post("/api/onboarding/tasks")
      .send({ hasChildren: "no" })
      .set("Content-Type", "application/json");
    expect(invalidChildren.status).toBe(422);
    expect(invalidChildren.body.message).toBe("Validation Failed");

    expect(taskRepo.findOnboardingPreviewTasks).not.toHaveBeenCalled();
  });

  it("returns 422 for an unsupported employmentStatus enum value", async () => {
    const invalidEmployment = await request(app)
      .post("/api/onboarding/tasks")
      .send({ employmentStatus: "CONTRACTOR" })
      .set("Content-Type", "application/json");
    expect(invalidEmployment.status).toBe(422);
    expect(invalidEmployment.body.message).toBe("Validation Failed");
    expect(invalidEmployment.body.details).toBeDefined();

    expect(taskRepo.findOnboardingPreviewTasks).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid date payloads", async () => {
    const invalidArrivalDate = await request(app)
      .post("/api/onboarding/tasks")
      .send({ arrivalDate: "2026-02-30" })
      .set("Content-Type", "application/json");
    expect(invalidArrivalDate.status).toBe(400);
    expect(invalidArrivalDate.body.error).toContain("Invalid arrivalDate");

    const invalidPlannedDate = await request(app)
      .post("/api/onboarding/tasks")
      .send({ plannedArrivalDate: "not-a-date" })
      .set("Content-Type", "application/json");
    expect(invalidPlannedDate.status).toBe(400);
    expect(invalidPlannedDate.body.error).toContain("Invalid plannedArrivalDate");

    expect(taskRepo.findOnboardingPreviewTasks).not.toHaveBeenCalled();
  });

  it("delegates to findOnboardingPreviewTasks and returns minimal task data", async () => {
    vi.mocked(taskRepo.findOnboardingPreviewTasks).mockResolvedValueOnce([
      {
        id: "task-1",
        title: "Register with police",
        shortDescription: "Complete police registration",
        category: "ARRIVAL",
        sortOrder: 20,
      },
    ] as never);

    const response = await request(app)
      .post("/api/onboarding/tasks")
      .send({
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED",
        arrivalDate: "2026-03-01",
        plannedArrivalDate: "2026-02-25",
      })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: "task-1",
        title: "Register with police",
        shortDescription: "Complete police registration",
        category: "ARRIVAL",
        sortOrder: 20,
      },
    ]);

    expect(getRelevantTaskWhere).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "onboarding-preview",
        isEU: true,
        hasChildren: false,
        employmentStatus: "EMPLOYED",
        arrivalDate: new Date("2026-03-01T00:00:00.000Z"),
        plannedArrivalDate: new Date("2026-02-25T00:00:00.000Z"),
      }),
      expect.any(Date),
    );

    expect(taskRepo.findOnboardingPreviewTasks).toHaveBeenCalledWith({ mockedWhere: true });
  });

  it("returns 500 when findOnboardingPreviewTasks throws", async () => {
    vi.mocked(taskRepo.findOnboardingPreviewTasks).mockRejectedValueOnce(new Error("db down"));

    const response = await request(app)
      .post("/api/onboarding/tasks")
      .send({ isEU: false })
      .set("Content-Type", "application/json");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch onboarding tasks");
  });
});

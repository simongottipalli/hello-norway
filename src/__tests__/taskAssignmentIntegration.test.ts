import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../lib/prisma";
import { syncUserTaskAssignments } from "../services/taskAssignmentService";
import type { User, Task } from "../generated/prisma/client.js";

describe("Task Assignment Integration Tests", () => {
  let testUser: User;
  let testTasks: {
    evergreen: Task;
    euOnly: Task;
    childrenOnly: Task;
    employedOnly: Task;
    arrivalWindow: Task;
    combined: Task;
  };

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-assignment-${Date.now()}@example.com`,
        name: "Test User",
        isEU: null,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      },
    });

    // Create test tasks with different requirements
    testTasks = {
      evergreen: await prisma.task.create({
        data: {
          slug: `test-evergreen-${Date.now()}`,
          title: "Evergreen Task",
          shortDescription: "Available to everyone",
          body: "Test body",
          category: "OTHER",
          sortOrder: 1,
          officialLinks: {},
          requiresEU: null,
          requiresChildren: null,
          requiresEmploymentStatus: [],
          minDaysFromArrival: null,
          maxDaysFromArrival: null,
        },
      }),
      euOnly: await prisma.task.create({
        data: {
          slug: `test-eu-${Date.now()}`,
          title: "EU Task",
          shortDescription: "Only for EU citizens",
          body: "Test body",
          category: "OTHER",
          sortOrder: 2,
          officialLinks: {},
          requiresEU: true,
          requiresChildren: null,
          requiresEmploymentStatus: [],
          minDaysFromArrival: null,
          maxDaysFromArrival: null,
        },
      }),
      childrenOnly: await prisma.task.create({
        data: {
          slug: `test-children-${Date.now()}`,
          title: "Children Task",
          shortDescription: "Only for users with children",
          body: "Test body",
          category: "FAMILY",
          sortOrder: 3,
          officialLinks: {},
          requiresEU: null,
          requiresChildren: true,
          requiresEmploymentStatus: [],
          minDaysFromArrival: null,
          maxDaysFromArrival: null,
        },
      }),
      employedOnly: await prisma.task.create({
        data: {
          slug: `test-employed-${Date.now()}`,
          title: "Employment Task",
          shortDescription: "Only for employed users",
          body: "Test body",
          category: "TAX_WORK",
          sortOrder: 4,
          officialLinks: {},
          requiresEU: null,
          requiresChildren: null,
          requiresEmploymentStatus: ["EMPLOYED"],
          minDaysFromArrival: null,
          maxDaysFromArrival: null,
        },
      }),
      arrivalWindow: await prisma.task.create({
        data: {
          slug: `test-arrival-${Date.now()}`,
          title: "Arrival Window Task",
          shortDescription: "Available 0-30 days after arrival",
          body: "Test body",
          category: "ARRIVAL",
          sortOrder: 5,
          officialLinks: {},
          requiresEU: null,
          requiresChildren: null,
          requiresEmploymentStatus: [],
          minDaysFromArrival: 0,
          maxDaysFromArrival: 30,
        },
      }),
      combined: await prisma.task.create({
        data: {
          slug: `test-combined-${Date.now()}`,
          title: "Combined Requirements Task",
          shortDescription: "EU + Children + Employed + 7-60 days",
          body: "Test body",
          category: "OTHER",
          sortOrder: 6,
          officialLinks: {},
          requiresEU: true,
          requiresChildren: true,
          requiresEmploymentStatus: ["EMPLOYED", "SELF_EMPLOYED"],
          minDaysFromArrival: 7,
          maxDaysFromArrival: 60,
        },
      }),
    };
  });

  afterAll(async () => {
    // Clean up
    await prisma.userTask.deleteMany({ where: { userId: testUser.id } });
    await prisma.task.deleteMany({
      where: {
        id: {
          in: Object.values(testTasks).map((t) => t.id),
        },
      },
    });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up user tasks before each test
    await prisma.userTask.deleteMany({ where: { userId: testUser.id } });
  });

  describe("Signup - User with no profile information", () => {
    it("should assign tasks with no eligibility requirements, ignoring arrival window", async () => {
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: null,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      // Evergreen task (no constraints at all) and arrival-windowed task (no eligibility
      // constraints) should both be included — arrival window is not applied when the
      // user has no arrival date yet.
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).toContain(testTasks.arrivalWindow.id);
      // Tasks requiring specific eligibility must not be shown to a user with unknown profile.
      expect(taskIds).not.toContain(testTasks.euOnly.id);
      expect(taskIds).not.toContain(testTasks.childrenOnly.id);
      expect(taskIds).not.toContain(testTasks.employedOnly.id);
      expect(taskIds).not.toContain(testTasks.combined.id);
      expect(assignments.every((a) => a.status === "TODO")).toBe(true);
    });
  });

  describe("Profile-based filtering", () => {
    it("should assign EU tasks to EU citizens", async () => {
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: true,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).toContain(testTasks.euOnly.id);
      expect(taskIds).not.toContain(testTasks.childrenOnly.id);
      expect(taskIds).not.toContain(testTasks.employedOnly.id);
    });

    it("should not assign EU tasks to non-EU citizens", async () => {
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: false,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).not.toContain(testTasks.euOnly.id);
    });

    it("should assign children tasks to users with children", async () => {
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: null,
        hasChildren: true,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).toContain(testTasks.childrenOnly.id);
    });

    it("should assign employment-specific tasks based on employment status", async () => {
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: null,
        hasChildren: null,
        employmentStatus: "EMPLOYED",
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).toContain(testTasks.employedOnly.id);
    });
  });

  describe("Arrival date-based filtering", () => {
    it("should assign tasks within arrival window", async () => {
      const arrivalDate = new Date();
      arrivalDate.setDate(arrivalDate.getDate() - 15); // 15 days ago

      await syncUserTaskAssignments(
        {
          id: testUser.id,
          isEU: null,
          hasChildren: null,
          employmentStatus: null,
          arrivalDate,
          plannedArrivalDate: null,
        },
        { now: new Date() }
      );

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).toContain(testTasks.arrivalWindow.id); // 0-30 days
    });

    it("should not assign tasks outside arrival window", async () => {
      const arrivalDate = new Date();
      arrivalDate.setDate(arrivalDate.getDate() - 60); // 60 days ago

      await syncUserTaskAssignments(
        {
          id: testUser.id,
          isEU: null,
          hasChildren: null,
          employmentStatus: null,
          arrivalDate,
          plannedArrivalDate: null,
        },
        { now: new Date() }
      );

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).not.toContain(testTasks.arrivalWindow.id); // Should be expired
    });

    it("should use planned arrival date as fallback", async () => {
      const plannedArrivalDate = new Date();
      plannedArrivalDate.setDate(plannedArrivalDate.getDate() - 10); // 10 days ago

      await syncUserTaskAssignments(
        {
          id: testUser.id,
          isEU: null,
          hasChildren: null,
          employmentStatus: null,
          arrivalDate: null,
          plannedArrivalDate,
        },
        { now: new Date() }
      );

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.arrivalWindow.id);
    });
  });

  describe("Combined requirements", () => {
    it("should assign tasks matching all combined requirements", async () => {
      const arrivalDate = new Date();
      arrivalDate.setDate(arrivalDate.getDate() - 31); // 31 days ago (outside 0-30 window)

      await syncUserTaskAssignments(
        {
          id: testUser.id,
          isEU: true,
          hasChildren: true,
          employmentStatus: "EMPLOYED",
          arrivalDate,
          plannedArrivalDate: null,
        },
        { now: new Date() }
      );

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).toContain(testTasks.euOnly.id);
      expect(taskIds).toContain(testTasks.childrenOnly.id);
      expect(taskIds).toContain(testTasks.employedOnly.id);
      expect(taskIds).toContain(testTasks.combined.id);
      expect(taskIds).not.toContain(testTasks.arrivalWindow.id); // Outside 0-30 window
    });

    it("should not assign combined task if one requirement is missing", async () => {
      const arrivalDate = new Date();
      arrivalDate.setDate(arrivalDate.getDate() - 30);

      await syncUserTaskAssignments(
        {
          id: testUser.id,
          isEU: true,
          hasChildren: false, // Missing children requirement
          employmentStatus: "EMPLOYED",
          arrivalDate,
          plannedArrivalDate: null,
        },
        { now: new Date() }
      );

      const assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).not.toContain(testTasks.combined.id);
    });
  });

  describe("Profile updates", () => {
    it("should add new tasks when profile is updated to match requirements", async () => {
      // Initial state: no EU status
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: null,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      let assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });
      // EU-specific task must not be assigned when isEU is unknown
      expect(assignments.map((a) => a.task.id)).not.toContain(testTasks.euOnly.id);

      // Update: becomes EU citizen
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: true,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      const taskIds = assignments.map((a) => a.task.id);
      expect(taskIds).toContain(testTasks.evergreen.id);
      expect(taskIds).toContain(testTasks.euOnly.id);
    });

    it("should remove TODO tasks when profile no longer matches", async () => {
      // Initial state: EU citizen
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: true,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      let assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });
      expect(assignments.map((a) => a.task.id)).toContain(testTasks.euOnly.id);

      // Update: no longer EU citizen
      await syncUserTaskAssignments(
        {
          id: testUser.id,
          isEU: false,
          hasChildren: null,
          employmentStatus: null,
          arrivalDate: null,
          plannedArrivalDate: null,
        },
        { removeOutdatedTodoAssignments: true }
      );

      assignments = await prisma.userTask.findMany({
        where: { userId: testUser.id },
        include: { task: true },
      });

      expect(assignments.map((a) => a.task.id)).not.toContain(testTasks.euOnly.id);
    });

    it("should not remove DONE tasks when profile changes", async () => {
      // Assign and mark as done
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: true,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      await prisma.userTask.updateMany({
        where: {
          userId: testUser.id,
          taskId: testTasks.euOnly.id,
        },
        data: {
          status: "DONE",
          completedAt: new Date(),
        },
      });

      // Change profile
      await syncUserTaskAssignments(
        {
          id: testUser.id,
          isEU: false,
          hasChildren: null,
          employmentStatus: null,
          arrivalDate: null,
          plannedArrivalDate: null,
        },
        { removeOutdatedTodoAssignments: true }
      );

      const doneTask = await prisma.userTask.findFirst({
        where: {
          userId: testUser.id,
          taskId: testTasks.euOnly.id,
        },
      });

      expect(doneTask).not.toBeNull();
      expect(doneTask?.status).toBe("DONE");
    });
  });

  describe("No duplicate assignments", () => {
    it("should not create duplicate task assignments", async () => {
      // Assign tasks
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: true,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      const firstCount = await prisma.userTask.count({
        where: { userId: testUser.id },
      });

      // Run sync again with same profile
      await syncUserTaskAssignments({
        id: testUser.id,
        isEU: true,
        hasChildren: null,
        employmentStatus: null,
        arrivalDate: null,
        plannedArrivalDate: null,
      });

      const secondCount = await prisma.userTask.count({
        where: { userId: testUser.id },
      });

      expect(secondCount).toBe(firstCount);
    });
  });
});

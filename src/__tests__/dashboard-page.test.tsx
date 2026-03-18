import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { isTaskOverdue, isTaskUpcoming } from "@/lib/dateUtils";
import type { Task } from "@/types/task";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

// Mock AuthProvider
vi.mock("@/components/AuthProvider", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: "1", email: "test@example.com", name: "Test User" },
    refreshSession: vi.fn(),
  })),
}));

describe("Dashboard page", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders loading skeleton during data fetch", async () => {
    const DashboardPage = (await import("../app/dashboard/page")).default;
    const html = renderToStaticMarkup(<DashboardPage />);

    // Component shows skeleton when fetching data
    expect(html).toContain("animate-pulse");
    expect(html).toContain("bg-muted");
  });

  it("can be imported without errors", async () => {
    // Just verify the module can be imported successfully
    const dashboardModule = await import("../app/dashboard/page");
    expect(dashboardModule.default).toBeDefined();
    expect(typeof dashboardModule.default).toBe("function");
  });
});

describe("Dashboard loading skeleton", () => {
  it("renders loading skeleton correctly", async () => {
    const DashboardLoading = (await import("../app/dashboard/loading")).default;
    const html = renderToStaticMarkup(<DashboardLoading />);

    // Check for skeleton elements
    expect(html).toContain("animate-pulse");
    expect(html).toContain("bg-muted");
  });

  it("can be imported without errors", async () => {
    // Verify the loading module can be imported successfully
    const loadingModule = await import("../app/dashboard/loading");
    expect(loadingModule.default).toBeDefined();
    expect(typeof loadingModule.default).toBe("function");
  });
});

describe("Dashboard date logic and filtering", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Helper to create a date string at UTC midnight
  const createUtcDateString = (daysFromNow: number): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + daysFromNow);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T00:00:00.000Z`;
  };

  describe("Task overdue classification", () => {
    it("classifies tasks past due date as overdue", () => {
      const mockTask = {
        id: "1",
        title: "Overdue Task",
        slug: "overdue-task",
        shortDescription: "This is overdue",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
        dueDate: createUtcDateString(-5), // 5 days ago
      };

      expect(isTaskOverdue(mockTask)).toBe(true);
    });

    it("does not classify completed tasks as overdue even if past due", () => {
      const mockTask = {
        id: "1",
        title: "Completed Task",
        slug: "completed-task",
        shortDescription: "This is completed",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "DONE" as const,
        dueDate: createUtcDateString(-5), // 5 days ago
      };

      expect(isTaskOverdue(mockTask)).toBe(false);
    });
  });

  describe("Task upcoming classification", () => {
    it("classifies tasks due today as upcoming", () => {
      const mockTask = {
        id: "1",
        title: "Due Today",
        slug: "due-today",
        shortDescription: "Due today",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
        dueDate: createUtcDateString(0), // today
      };

      expect(isTaskUpcoming(mockTask)).toBe(true);
    });

    it("classifies tasks due in 7 days as upcoming", () => {
      const mockTask = {
        id: "1",
        title: "Due in 7 days",
        slug: "due-in-7",
        shortDescription: "Due in a week",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
        dueDate: createUtcDateString(7),
      };

      expect(isTaskUpcoming(mockTask)).toBe(true);
    });

    it("classifies tasks due in 14 days as upcoming", () => {
      const mockTask = {
        id: "1",
        title: "Due in 14 days",
        slug: "due-in-14",
        shortDescription: "Due in two weeks",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
        dueDate: createUtcDateString(14),
      };

      expect(isTaskUpcoming(mockTask)).toBe(true);
    });

    it("does not classify tasks due in 15+ days as upcoming", () => {
      const mockTask = {
        id: "1",
        title: "Due in 15 days",
        slug: "due-in-15",
        shortDescription: "Due in 15 days",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
        dueDate: createUtcDateString(15),
      };

      expect(isTaskUpcoming(mockTask)).toBe(false);
    });

    it("does not classify completed tasks as upcoming", () => {
      const mockTask = {
        id: "1",
        title: "Completed upcoming task",
        slug: "completed-upcoming",
        shortDescription: "This is completed",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "DONE" as const,
        dueDate: createUtcDateString(7),
      };

      expect(isTaskUpcoming(mockTask)).toBe(false);
    });
  });

  describe("Date handling across timezones", () => {
    it("handles UTC midnight dates consistently", () => {
      const utcMidnight = "2026-03-15T00:00:00.000Z";
      const date = new Date(utcMidnight);

      // Verify the date is at UTC midnight
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
    });

    it("handles date-only comparisons without time component", () => {
      const date1 = "2026-03-15T00:00:00.000Z";
      const date2 = "2026-03-16T00:00:00.000Z";

      const d1 = new Date(date1);
      const d2 = new Date(date2);

      // Dates should be comparable
      expect(d1.getTime()).toBeLessThan(d2.getTime());
    });
  });

  describe("Task filtering", () => {
    const mockTasks = [
      {
        id: "1",
        title: "Arrival Task",
        slug: "arrival-task",
        shortDescription: "Arrival",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
      },
      {
        id: "2",
        title: "Health Task",
        slug: "health-task",
        shortDescription: "Health",
        body: "Body",
        category: "HEALTH",
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "SAVED" as const,
      },
      {
        id: "3",
        title: "Tax Task",
        slug: "tax-task",
        shortDescription: "Tax",
        body: "Body",
        category: "TAX_WORK",
        sortOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "DONE" as const,
      },
    ];

    it("filters tasks by category", () => {
      const arrivalTasks = mockTasks.filter((t) => t.category === "ARRIVAL");
      expect(arrivalTasks).toHaveLength(1);
      expect(arrivalTasks[0].title).toBe("Arrival Task");
    });

    it("filters tasks by both category and status", () => {
      const filtered = mockTasks.filter(
        (t) => t.category === "ARRIVAL" && t.status === "TODO",
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("Arrival Task");
    });
  });
});

describe("Dashboard view conditions", () => {
  // Helper to build a minimal Task for filtering tests
  const createTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: "1",
      title: "Test Task",
      slug: "test-task",
      shortDescription: "Test description",
      body: "Body",
      category: "ARRIVAL",
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "TODO",
      dueDate: null,
      ...overrides,
    }) as Task;

  const createUtcDateString = (daysFromNow: number): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + daysFromNow);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T00:00:00.000Z`;
  };

  describe("Empty state condition (no overdue and no upcoming tasks)", () => {
    it("shows empty state when tasks list is empty", () => {
      const tasks: Task[] = [];
      const overdueTasks = tasks.filter(isTaskOverdue);
      const upcomingTasks = tasks.filter(isTaskUpcoming);

      expect(overdueTasks.length === 0 && upcomingTasks.length === 0).toBe(true);
    });

    it("shows empty state when all tasks have no due date", () => {
      const tasks = [
        createTask({ id: "1", dueDate: null }),
        createTask({ id: "2", dueDate: null }),
      ];
      const overdueTasks = tasks.filter(isTaskOverdue);
      const upcomingTasks = tasks.filter(isTaskUpcoming);

      expect(overdueTasks.length === 0 && upcomingTasks.length === 0).toBe(true);
    });

    it("shows empty state when all tasks are due more than 14 days away", () => {
      const tasks = [
        createTask({ id: "1", dueDate: createUtcDateString(15) }),
        createTask({ id: "2", dueDate: createUtcDateString(30) }),
      ];
      const overdueTasks = tasks.filter(isTaskOverdue);
      const upcomingTasks = tasks.filter(isTaskUpcoming);

      expect(overdueTasks.length === 0 && upcomingTasks.length === 0).toBe(true);
    });

    it("shows empty state when only completed tasks exist (even if overdue)", () => {
      const tasks = [
        createTask({ id: "1", status: "DONE", dueDate: createUtcDateString(-5) }),
        createTask({ id: "2", status: "DONE", dueDate: createUtcDateString(3) }),
      ];
      const overdueTasks = tasks.filter(isTaskOverdue);
      const upcomingTasks = tasks.filter(isTaskUpcoming);

      expect(overdueTasks.length === 0 && upcomingTasks.length === 0).toBe(true);
    });
  });

  describe("Overdue / upcoming sections visible when tasks exist", () => {
    it("does not show empty state when there are overdue tasks", () => {
      const tasks = [createTask({ dueDate: createUtcDateString(-3) })];
      const overdueTasks = tasks.filter(isTaskOverdue);
      const upcomingTasks = tasks.filter(isTaskUpcoming);

      // At least one section has tasks — empty state should NOT show
      expect(overdueTasks.length === 0 && upcomingTasks.length === 0).toBe(false);
    });

    it("does not show empty state when there are upcoming tasks", () => {
      const tasks = [createTask({ dueDate: createUtcDateString(5) })];
      const overdueTasks = tasks.filter(isTaskOverdue);
      const upcomingTasks = tasks.filter(isTaskUpcoming);

      expect(overdueTasks.length === 0 && upcomingTasks.length === 0).toBe(false);
    });

    it("does not show empty state when both overdue and upcoming tasks exist", () => {
      const tasks = [
        createTask({ id: "1", dueDate: createUtcDateString(-2) }),  // overdue
        createTask({ id: "2", dueDate: createUtcDateString(7) }),   // upcoming
      ];
      const overdueTasks = tasks.filter(isTaskOverdue);
      const upcomingTasks = tasks.filter(isTaskUpcoming);

      expect(overdueTasks.length === 0 && upcomingTasks.length === 0).toBe(false);
      expect(overdueTasks).toHaveLength(1);
      expect(upcomingTasks).toHaveLength(1);
    });
  });

  describe("All Tasks section is hidden by default", () => {
    it("dashboard renders loading skeleton on initial mount (before tasks load)", async () => {
      vi.mock("@/components/AuthProvider", () => ({
        useAuth: vi.fn(() => ({
          isAuthenticated: true,
          isLoading: false,
          user: { id: "1", email: "test@example.com", name: "Test User" },
          refreshSession: vi.fn(),
        })),
      }));

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const DashboardPage = (await import("../app/dashboard/page")).default;
      const html = renderToStaticMarkup(<DashboardPage />);

      // On initial render (tasks still loading), the skeleton is shown
      // and the All Tasks grid is not rendered
      expect(html).toContain("animate-pulse");
      expect(html).not.toContain("All Tasks");
      expect(html).not.toContain("Filter by Category");
    });
  });
});

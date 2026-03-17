import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { isTaskOverdue, isTaskUpcoming } from "@/lib/dateUtils";
import { filterTasksByStatus } from "@/lib/taskHelpers";

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

    it("filters tasks by status using filterTasksByStatus helper", () => {
      const todoTasks = filterTasksByStatus(mockTasks, "TODO");
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].title).toBe("Arrival Task");

      const savedTasks = filterTasksByStatus(mockTasks, "SAVED");
      expect(savedTasks).toHaveLength(1);
      expect(savedTasks[0].title).toBe("Health Task");

      const doneTasks = filterTasksByStatus(mockTasks, "DONE");
      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].title).toBe("Tax Task");

      const allTasks = filterTasksByStatus(mockTasks, "ALL");
      expect(allTasks).toHaveLength(3);
    });

    it("filters tasks by pending status (combines TODO and SAVED) using filterTasksByStatus helper", () => {
      const pendingTasks = filterTasksByStatus(mockTasks, "PENDING");
      expect(pendingTasks).toHaveLength(2);
      expect(pendingTasks.map((t) => t.title)).toContain("Arrival Task");
      expect(pendingTasks.map((t) => t.title)).toContain("Health Task");
      expect(pendingTasks.map((t) => t.title)).not.toContain("Tax Task");
    });

    it("filters tasks by both category and status", () => {
      const filtered = mockTasks.filter(
        (t) => t.category === "ARRIVAL" && t.status === "TODO",
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("Arrival Task");
    });
  });

  describe("Task sorting", () => {
    const mockTasksForSorting = [
      {
        id: "3",
        title: "Task C",
        slug: "task-c",
        shortDescription: "C",
        body: "Body",
        category: "HEALTH",
        sortOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
        dueDate: "2026-03-20T00:00:00.000Z",
      },
      {
        id: "1",
        title: "Task A",
        slug: "task-a",
        shortDescription: "A",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
        dueDate: "2026-03-15T00:00:00.000Z",
      },
      {
        id: "2",
        title: "Task B",
        slug: "task-b",
        shortDescription: "B",
        body: "Body",
        category: "ARRIVAL",
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "TODO" as const,
        dueDate: "2026-03-18T00:00:00.000Z",
      },
    ];

    it("sorts tasks by due date", () => {
      const sorted = [...mockTasksForSorting].sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });

      expect(sorted[0].title).toBe("Task A");
      expect(sorted[1].title).toBe("Task B");
      expect(sorted[2].title).toBe("Task C");
    });

    it("sorts tasks by category", () => {
      const sorted = [...mockTasksForSorting].sort((a, b) =>
        a.category.localeCompare(b.category),
      );

      expect(sorted[0].category).toBe("ARRIVAL");
      expect(sorted[1].category).toBe("ARRIVAL");
      expect(sorted[2].category).toBe("HEALTH");
    });

    it("sorts tasks by sort order", () => {
      const sorted = [...mockTasksForSorting].sort((a, b) => a.sortOrder - b.sortOrder);

      expect(sorted[0].sortOrder).toBe(1);
      expect(sorted[1].sortOrder).toBe(2);
      expect(sorted[2].sortOrder).toBe(3);
    });

    it("does not mutate original array when sorting", () => {
      const original = [...mockTasksForSorting];
      const sorted = [...mockTasksForSorting].sort((a, b) => a.sortOrder - b.sortOrder);

      // Verify original order is preserved
      expect(original[0].id).toBe("3");
      expect(original[1].id).toBe("1");
      expect(original[2].id).toBe("2");

      // Verify sorted is different
      expect(sorted[0].id).toBe("1");
      expect(sorted[1].id).toBe("2");
      expect(sorted[2].id).toBe("3");
    });
  });
});

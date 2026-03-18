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

describe("TaskListItem", () => {
  const makeTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: "task-1",
      title: "Register at Folkeregisteret",
      slug: "register-folkeregisteret",
      shortDescription: "Register your address in Norway",
      body: "Body",
      category: "IDENTITY_BANKING",
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "TODO",
      dueDate: null,
      ...overrides,
    }) as Task;

  it("renders an accessible View button with the task title in aria-label", async () => {
    const { TaskListItem } = await import("../app/dashboard/page");
    const task = makeTask({ title: "Get a D-number" });
    const html = renderToStaticMarkup(
      <TaskListItem task={task} onViewTask={() => {}} />,
    );
    expect(html).toContain('aria-label="View Get a D-number"');
    expect(html).toContain(">View<");
  });

  it("renders the task title and short description", async () => {
    const { TaskListItem } = await import("../app/dashboard/page");
    const task = makeTask({
      title: "Open a bank account",
      shortDescription: "Set up your Norwegian bank account",
    });
    const html = renderToStaticMarkup(
      <TaskListItem task={task} onViewTask={() => {}} />,
    );
    expect(html).toContain("Open a bank account");
    expect(html).toContain("Set up your Norwegian bank account");
  });

  it("renders a status badge for the default variant", async () => {
    const { TaskListItem } = await import("../app/dashboard/page");

    const todoHtml = renderToStaticMarkup(
      <TaskListItem task={makeTask({ status: "TODO" })} onViewTask={() => {}} />,
    );
    expect(todoHtml).toContain("To Do");

    const savedHtml = renderToStaticMarkup(
      <TaskListItem task={makeTask({ status: "SAVED" })} onViewTask={() => {}} />,
    );
    expect(savedHtml).toContain("In Progress");

    const doneHtml = renderToStaticMarkup(
      <TaskListItem task={makeTask({ status: "DONE" })} onViewTask={() => {}} />,
    );
    expect(doneHtml).toContain("Completed");
  });

  it("does not render a status badge for the overdue variant", async () => {
    const { TaskListItem } = await import("../app/dashboard/page");
    const task = makeTask({ status: "TODO" });
    const html = renderToStaticMarkup(
      <TaskListItem task={task} variant="overdue" onViewTask={() => {}} />,
    );
    expect(html).not.toContain("To Do");
    expect(html).not.toContain("In Progress");
    expect(html).not.toContain("Completed");
  });

  it("renders the due date when provided", async () => {
    const { TaskListItem } = await import("../app/dashboard/page");
    const task = makeTask({ dueDate: "2026-06-01T00:00:00.000Z" });
    const html = renderToStaticMarkup(
      <TaskListItem task={task} onViewTask={() => {}} />,
    );
    expect(html).toContain("Due:");
    expect(html).toContain("2026");
    expect(html).toContain("(Norway time)");
  });

  it("does not render a due date line when dueDate is null", async () => {
    const { TaskListItem } = await import("../app/dashboard/page");
    const task = makeTask({ dueDate: null });
    const html = renderToStaticMarkup(
      <TaskListItem task={task} onViewTask={() => {}} />,
    );
    expect(html).not.toContain("Due:");
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

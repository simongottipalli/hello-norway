import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

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

  it("renders loading state during data fetch", async () => {
    const DashboardPage = (await import("../app/dashboard/page")).default;
    const html = renderToStaticMarkup(<DashboardPage />);

    // Component shows loading state when fetching data
    expect(html).toContain("Loading dashboard...");
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

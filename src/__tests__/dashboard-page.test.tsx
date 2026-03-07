import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe("Dashboard page", () => {
  it("renders Suspense fallback during static rendering", async () => {
    vi.mock("@/components/AuthProvider", () => ({
      useAuth: vi.fn(() => ({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        refreshSession: vi.fn(),
      })),
    }));

    const DashboardPage = (await import("../app/dashboard/page")).default;
    const html = renderToStaticMarkup(<DashboardPage />);

    // During static rendering, Suspense shows the fallback
    expect(html).toContain("Loading dashboard...");
  });

  it("can be imported without errors", async () => {
    // Just verify the module can be imported successfully
    const dashboardModule = await import("../app/dashboard/page");
    expect(dashboardModule.default).toBeDefined();
    expect(typeof dashboardModule.default).toBe("function");
  });
});

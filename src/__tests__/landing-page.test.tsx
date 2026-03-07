import { describe, it, expect, vi } from "vitest";

// Mock Next.js router and auth context
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    refreshSession: vi.fn(),
  })),
}));

describe("Landing page", () => {
  it("should import landing page component without errors", async () => {
    const Home = (await import("../app/page")).default;
    expect(Home).toBeDefined();
  });
});

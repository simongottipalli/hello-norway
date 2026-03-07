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

describe("Onboarding page", () => {
  it("should import onboarding page without errors", async () => {
    const OnboardingPage = (await import("../app/onboarding/page")).default;
    expect(OnboardingPage).toBeDefined();
  });

  it("should import onboarding survey component without errors", async () => {
    const { OnboardingSurvey } = await import("../components/OnboardingSurvey");
    expect(OnboardingSurvey).toBeDefined();
  });
});

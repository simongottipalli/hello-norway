import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mock Next.js router and auth context
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
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
  it("renders survey flow with required onboarding questions and progress UI", async () => {
    const OnboardingPage = (await import("../app/onboarding/page")).default;
    const html = renderToStaticMarkup(<OnboardingPage />);

    expect(html).toContain("Onboarding questionnaire");
    expect(html).toContain("Where are you applying from?");
    expect(html).toContain("What citizenships do you have?");
    expect(html).toContain("What are you applying as?");
    expect(html).toContain("How old are you?");
    expect(html).toContain('role="progressbar"');
  });
});

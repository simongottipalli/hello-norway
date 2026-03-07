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

describe("Landing page", () => {
  it("renders required sections and onboarding call-to-actions", async () => {
    const Home = (await import("../app/page")).default;
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain("Settle in, faster.");
    expect(html).toContain("The problem");
    expect(html).toContain("The solution");
    expect(html).toContain("Key features");
    // Login/signup nav links live in the global Header, not in the page itself
    expect(html).not.toContain('href="/login"');
    expect(html).toContain('href="/onboarding"');
    // Hero CTA + bottom CTA (the old inline nav "Sign up" has moved to the Header)
    expect((html.match(/href="\/onboarding"/g) ?? []).length).toBe(2);
    expect((html.match(/>Start</g) ?? []).length).toBe(2);
  });
});

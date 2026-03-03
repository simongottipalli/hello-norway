import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OnboardingPage from "../app/onboarding/page";

describe("Onboarding page", () => {
  it("renders survey flow with required onboarding questions and progress UI", () => {
    const html = renderToStaticMarkup(<OnboardingPage />);

    expect(html).toContain("Onboarding questionnaire");
    expect(html).toContain("Where are you applying from?");
    expect(html).toContain("What citizenships do you have?");
    expect(html).toContain("What are you applying as?");
    expect(html).toContain("How old are you?");
    expect(html).toContain("h-2 w-full overflow-hidden rounded-full bg-muted");
  });
});

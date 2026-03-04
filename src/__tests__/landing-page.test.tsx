import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../app/page";

describe("Landing page", () => {
  it("renders required sections and onboarding call-to-actions", () => {
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
    expect(html).toContain("Proudly 100% built by and in European technology.");
    expect(html).toContain(
      'href="https://github.com/simongottipalli/hello-norway/pulls"'
    );
    expect(html).toContain(
      'href="https://github.com/simongottipalli/hello-norway/issues/new/choose"'
    );
    expect(html).toContain(
      'href="https://github.com/simongottipalli/hello-norway/discussions"'
    );
    expect(html).toContain(
      'href="https://github.com/sponsors/simongottipalli"'
    );
  });
});

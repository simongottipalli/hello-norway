import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../app/page";

describe("Landing page", () => {
  it("renders required sections and signup call-to-actions", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain("Settle in, faster.");
    expect(html).toContain("The problem");
    expect(html).toContain("The solution");
    expect(html).toContain("Key features");
    // Login/signup nav links live in the global Header, not in the page itself
    expect(html).not.toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    // Hero CTA + bottom CTA (the old inline nav "Sign up" has moved to the Header)
    expect((html.match(/href="\/signup"/g) ?? []).length).toBe(2);
    expect((html.match(/>Start</g) ?? []).length).toBe(2);
  });
});

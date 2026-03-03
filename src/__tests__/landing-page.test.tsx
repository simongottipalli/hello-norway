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
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    expect((html.match(/href="\/signup"/g) ?? []).length).toBe(3);
    expect((html.match(/>Start</g) ?? []).length).toBe(2);
  });
});

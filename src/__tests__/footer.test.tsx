import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Footer } from "../components/Footer";

describe("Footer", () => {
  it("renders Oslo branding and contribution links", () => {
    const html = renderToStaticMarkup(<Footer />);

    expect(html).toContain("🏙️ Made in Oslo 🇳🇴");
    expect(html).toContain("Contribute");
    expect(html).toContain("Report an issue");
    expect(html).toContain("Collaborate");
    expect(html).toContain("Donate");
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

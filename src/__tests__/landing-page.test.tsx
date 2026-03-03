import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("Landing page", () => {
  it("contains required sections and signup call-to-actions", () => {
    const pageSource = readFileSync(
      path.join(process.cwd(), "src/app/page.tsx"),
      "utf-8"
    );

    expect(pageSource).toContain("Settle in, faster.");
    expect(pageSource).toContain("The problem");
    expect(pageSource).toContain("The solution");
    expect(pageSource).toContain("Key features");
    expect(pageSource).toContain('href="/login"');
    expect(pageSource).toContain('href="/signup"');
    expect(pageSource).toContain(">Start<");
  });
});

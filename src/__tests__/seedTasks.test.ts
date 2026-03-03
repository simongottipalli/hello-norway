import { describe, expect, it } from "vitest";
import { tasks } from "../../prisma/seed";

describe("Prisma seed task library", () => {
  it("defines 12-15 essential predefined tasks", () => {
    expect(tasks.length).toBeGreaterThanOrEqual(12);
    expect(tasks.length).toBeLessThanOrEqual(15);
  });

  it("includes the required core admin tasks", () => {
    const slugs = tasks.map((task) => task.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        "register-address-folkeregisteret",
        "apply-tax-deduction-card",
        "submit-tax-return",
        "open-bank-account-and-get-bankid",
        "register-with-gp-fastlege",
        "apply-child-benefit",
        "notify-nav-if-unemployed",
        "renew-residence-permit-before-expiry",
      ])
    );
  });

  it("keeps complete content for each task", () => {
    for (const task of tasks) {
      expect(task.title).toBeTruthy();
      expect(task.shortDescription).toBeTruthy();
      expect(task.body).toContain("Why it matters:");
      expect(task.officialLinks.length).toBeGreaterThan(0);
      expect(task.recurrenceType).toMatch(/^(ONCE|YEARLY|CUSTOM)$/);
    }
  });
});

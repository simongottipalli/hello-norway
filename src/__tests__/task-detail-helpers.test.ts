import { describe, expect, it } from "vitest";
import {
  extractWhyItMatters,
  formatRecurrenceInfo,
  getOfficialLinks,
  getTaskDescription,
} from "../components/TaskList";

describe("Task detail helper formatting", () => {
  it("splits description and why-it-matters content from task body", () => {
    const body = "Do the important setup. Why it matters: It unlocks public services.";

    expect(getTaskDescription(body)).toBe("Do the important setup.");
    expect(extractWhyItMatters(body)).toBe("It unlocks public services.");
  });

  it("returns empty why-it-matters text when marker is missing", () => {
    expect(extractWhyItMatters("Body without marker")).toBe("");
  });

  it("normalizes official links data from task payload", () => {
    const links = getOfficialLinks([
      { label: "Skatteetaten", url: "https://www.skatteetaten.no" },
      { label: "Invalid without url" },
    ]);

    expect(links).toEqual([{ label: "Skatteetaten", url: "https://www.skatteetaten.no" }]);
  });

  it("formats recurrence timing text from arrival-day windows", () => {
    expect(formatRecurrenceInfo(0, 30)).toBe("Recommended timing: 0 to 30 days from arrival.");
    expect(formatRecurrenceInfo(null, null)).toBe("No timing window specified.");
  });
});

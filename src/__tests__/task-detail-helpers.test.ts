import { describe, expect, it } from "vitest";
import {
  extractWhyItMatters,
  filterTasksByStatus,
  formatRecurrenceInfo,
  getOfficialLinks,
  getTaskDescription,
  sortTasksByDueDate,
} from "../lib/taskHelpers";

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

  it("handles non-array official links input gracefully", () => {
    // TaskForm passes `{}` by default; ensure we handle it without throwing.
    const links = getOfficialLinks({});

    expect(links).toEqual([]);
  });

  it("formats recurrence timing text from arrival-day windows", () => {
    expect(formatRecurrenceInfo(0, 30)).toBe("Recommended timing: 0 to 30 days from arrival.");
    expect(formatRecurrenceInfo(null, null)).toBe("No timing window specified.");
  });

  it("formats recurrence timing text when only min or max is specified", () => {
    expect(formatRecurrenceInfo(5, null)).toBe(
      "Recommended timing: From 5 days from arrival.",
    );
    expect(formatRecurrenceInfo(null, 10)).toBe(
      "Recommended timing: Up to 10 days from arrival.",
    );
  });

  it("returns full body as description when marker is missing", () => {
    const body = "Body without why-it-matters marker";

    expect(getTaskDescription(body)).toBe(body);
  });
});

describe("filterTasksByStatus", () => {
  const makeTasks = (statuses: Array<"TODO" | "SAVED" | "DONE">) =>
    statuses.map((status, i) => ({ id: String(i), status } as Parameters<typeof filterTasksByStatus>[0][number]));

  it('returns all tasks for "ALL"', () => {
    const tasks = makeTasks(["TODO", "SAVED", "DONE"]);
    expect(filterTasksByStatus(tasks, "ALL")).toHaveLength(3);
  });

  it('returns only TODO and SAVED tasks for "PENDING"', () => {
    const tasks = makeTasks(["TODO", "SAVED", "DONE"]);
    const result = filterTasksByStatus(tasks, "PENDING");
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.status !== "DONE")).toBe(true);
  });

  it('returns only DONE tasks for "DONE"', () => {
    const tasks = makeTasks(["TODO", "SAVED", "DONE"]);
    const result = filterTasksByStatus(tasks, "DONE");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("DONE");
  });
});

describe("sortTasksByDueDate", () => {
  const makeTask = (id: string, dueDate?: string | null) =>
    ({ id, dueDate: dueDate ?? null } as Parameters<typeof sortTasksByDueDate>[0][number]);

  it("sorts tasks in ascending order of due date", () => {
    const tasks = [
      makeTask("a", "2025-03-15"),
      makeTask("b", "2025-01-10"),
      makeTask("c", "2025-06-01"),
    ];
    const sorted = sortTasksByDueDate(tasks);
    expect(sorted.map((t) => t.id)).toEqual(["b", "a", "c"]);
  });

  it("places tasks without a due date after tasks with one", () => {
    const tasks = [
      makeTask("a", null),
      makeTask("b", "2025-03-15"),
      makeTask("c", undefined),
      makeTask("d", "2025-01-10"),
    ];
    const sorted = sortTasksByDueDate(tasks);
    expect(sorted[0].id).toBe("d");
    expect(sorted[1].id).toBe("b");
    // Tasks with no due date should be last (order between them is unspecified)
    expect(sorted.slice(2).map((t) => t.id)).toEqual(expect.arrayContaining(["a", "c"]));
  });

  it("returns a new array and does not mutate the original", () => {
    const tasks = [makeTask("a", "2025-05-01"), makeTask("b", "2025-01-01")];
    const original = [...tasks];
    sortTasksByDueDate(tasks);
    expect(tasks[0].id).toBe(original[0].id);
    expect(tasks[1].id).toBe(original[1].id);
  });
});

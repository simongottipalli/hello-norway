import { describe, it, expect } from "vitest";
import {
  parseUtcDate,
  isTaskOverdue,
  isTaskUpcoming,
  formatDueDateWithTimezone,
  type TaskWithDate,
} from "@/lib/dateUtils";

// Helper to create a date string at UTC midnight
const createUtcDateString = (daysFromNow: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T00:00:00.000Z`;
};

describe("Date Utility Functions", () => {
  describe("parseUtcDate", () => {
    it("parses date string as UTC midnight", () => {
      const date = parseUtcDate("2026-03-15T00:00:00.000Z");
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(2); // March is month 2 (0-indexed)
      expect(date.getUTCDate()).toBe(15);
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
    });

    it("handles date-only format (YYYY-MM-DD)", () => {
      const date = parseUtcDate("2026-03-15");
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(2);
      expect(date.getUTCDate()).toBe(15);
    });
  });

  describe("isTaskOverdue", () => {
    it("returns true for tasks past due date", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(-5), // 5 days ago
        status: "TODO",
      };
      expect(isTaskOverdue(task)).toBe(true);
    });

    it("returns false for tasks due today", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(0), // today
        status: "TODO",
      };
      expect(isTaskOverdue(task)).toBe(false);
    });

    it("returns false for tasks due in the future", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(5), // 5 days from now
        status: "TODO",
      };
      expect(isTaskOverdue(task)).toBe(false);
    });

    it("returns false for completed tasks even if past due", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(-5), // 5 days ago
        status: "DONE",
      };
      expect(isTaskOverdue(task)).toBe(false);
    });

    it("returns false for tasks without due date", () => {
      const task: TaskWithDate = {
        status: "TODO",
      };
      expect(isTaskOverdue(task)).toBe(false);
    });
  });

  describe("isTaskUpcoming", () => {
    it("returns true for tasks due today", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(0), // today
        status: "TODO",
      };
      expect(isTaskUpcoming(task)).toBe(true);
    });

    it("returns true for tasks due in 7 days", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(7),
        status: "TODO",
      };
      expect(isTaskUpcoming(task)).toBe(true);
    });

    it("returns true for tasks due in 14 days", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(14),
        status: "TODO",
      };
      expect(isTaskUpcoming(task)).toBe(true);
    });

    it("returns false for tasks due in 15+ days", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(15),
        status: "TODO",
      };
      expect(isTaskUpcoming(task)).toBe(false);
    });

    it("returns false for tasks already past due", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(-1), // yesterday
        status: "TODO",
      };
      expect(isTaskUpcoming(task)).toBe(false);
    });

    it("returns false for completed tasks even if within range", () => {
      const task: TaskWithDate = {
        dueDate: createUtcDateString(7),
        status: "DONE",
      };
      expect(isTaskUpcoming(task)).toBe(false);
    });

    it("returns false for tasks without due date", () => {
      const task: TaskWithDate = {
        status: "TODO",
      };
      expect(isTaskUpcoming(task)).toBe(false);
    });
  });

  describe("formatDueDateWithTimezone", () => {
    it("formats date in Norway time with timezone indicator", () => {
      const formatted = formatDueDateWithTimezone("2026-03-15T00:00:00.000Z");
      expect(formatted).toContain("2026");
      expect(formatted).toContain("(Norway time)");
    });

    it("handles date-only format", () => {
      const formatted = formatDueDateWithTimezone("2026-03-15");
      expect(formatted).toContain("2026");
      expect(formatted).toContain("(Norway time)");
    });
  });
});

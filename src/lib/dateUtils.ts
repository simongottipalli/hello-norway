/**
 * Date utility functions for handling UTC date-only values.
 * All functions treat dates as date-only (ignoring time) and perform calculations in UTC.
 */

export interface TaskWithDate {
  dueDate?: string;
  status: "TODO" | "SAVED" | "DONE";
}

/**
 * Parses a date string (YYYY-MM-DD or ISO format) as UTC midnight.
 * Ensures consistent date-only comparisons regardless of local timezone.
 */
export function parseUtcDate(dateString: string): Date {
  const datePart = dateString.slice(0, 10); // Extract YYYY-MM-DD
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Returns today's date at UTC midnight.
 * Used for consistent date comparisons.
 */
export function getTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Checks if a task is overdue.
 * A task is overdue if:
 * - It has a due date
 * - It's not completed (status !== "DONE")
 * - The due date is before today (UTC comparison)
 */
export function isTaskOverdue<T extends TaskWithDate>(task: T): boolean {
  if (!task.dueDate || task.status === "DONE") {
    return false;
  }

  const todayUtc = getTodayUtc();
  const dueDateUtc = parseUtcDate(task.dueDate);

  return dueDateUtc < todayUtc;
}

/**
 * Checks if a task is upcoming (due in the next 0-14 days).
 * A task is upcoming if:
 * - It has a due date
 * - It's not completed (status !== "DONE")
 * - The due date is today or within the next 14 days (UTC comparison)
 */
export function isTaskUpcoming<T extends TaskWithDate>(task: T): boolean {
  if (!task.dueDate || task.status === "DONE") {
    return false;
  }

  const todayUtc = getTodayUtc();
  const dueDateUtc = parseUtcDate(task.dueDate);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDifference = Math.floor(
    (dueDateUtc.getTime() - todayUtc.getTime()) / msPerDay
  );

  return daysDifference >= 0 && daysDifference <= 14;
}

/**
 * Formats a date string for display in Norway time (Europe/Oslo timezone).
 * Appends "(Norway time)" to provide clear context to users.
 */
export function formatDueDateWithTimezone(dateString: string): string {
  const date = parseUtcDate(dateString);
  const formatted = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Europe/Oslo",
  }).format(date);
  return `${formatted} (Norway time)`;
}

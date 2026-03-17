/**
 * Shared helper functions for task operations
 * Used by both TaskList and TaskDetailsModal components
 */

import type { Task, TaskTrackingState, ApiErrorResponse } from "@/types/task";

/** Task statuses that are grouped under the "Pending" filter option */
export const PENDING_STATUSES = ["TODO", "SAVED"] as const satisfies ReadonlyArray<
  NonNullable<Task["status"]>
>;

/** Valid values for the status filter dropdown in the All Tasks view */
export type StatusFilter = "ALL" | "PENDING" | NonNullable<Task["status"]>;

/**
 * Filters a list of tasks by the given status filter value.
 * "ALL" returns all tasks; "PENDING" matches TODO and SAVED; otherwise matches exactly.
 */
export const filterTasksByStatus = (tasks: Task[], status: StatusFilter): Task[] => {
  if (status === "ALL") return tasks;
  if (status === "PENDING") return tasks.filter((t) => PENDING_STATUSES.includes(t.status as (typeof PENDING_STATUSES)[number]));
  return tasks.filter((t) => t.status === status);
};

export type OfficialLink = {
  label: string;
  url: string;
};

/**
 * Converts a date string to the format expected by date input fields
 */
export const toDateInputValue = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
};

/**
 * Gets the initial tracking state for a task based on its current status
 */
export const getInitialTaskState = (task: Task): TaskTrackingState => ({
  status:
    task.status === "DONE" ? "completed" : task.status === "SAVED" ? "in_progress" : "not_started",
  dueDate: toDateInputValue(task.dueDate),
  personalNotes: task.personalNotes ?? "",
});

/**
 * Type guard to check if a value is an API error response
 */
export const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "error" in value &&
      typeof (value as { error?: unknown }).error === "string",
  );
};

/**
 * Extracts the "Why it matters" section from a task body
 */
export const extractWhyItMatters = (body: string): string => {
  const marker = "Why it matters:";
  const markerIndex = body.indexOf(marker);

  if (markerIndex === -1) {
    return "";
  }

  return body.slice(markerIndex + marker.length).trim();
};

/**
 * Gets the task description (everything before "Why it matters")
 */
export const getTaskDescription = (body: string): string => {
  const marker = "Why it matters:";
  const markerIndex = body.indexOf(marker);

  if (markerIndex === -1) {
    return body.trim();
  }

  return body.slice(0, markerIndex).trim();
};

/**
 * Parses and validates official links from task data
 */
export const getOfficialLinks = (value: unknown): OfficialLink[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const label = "label" in entry && typeof entry.label === "string" ? entry.label : null;
    const url = "url" in entry && typeof entry.url === "string" ? entry.url : null;

    if (!label || !url) {
      return [];
    }

    return [{ label, url }];
  });
};

/**
 * Formats the recurrence information for display
 */
export const formatRecurrenceInfo = (
  minDaysFromArrival?: number | null,
  maxDaysFromArrival?: number | null,
): string => {
  if (minDaysFromArrival == null && maxDaysFromArrival == null) {
    return "No timing window specified.";
  }

  if (minDaysFromArrival != null && maxDaysFromArrival != null) {
    return `Recommended timing: ${minDaysFromArrival} to ${maxDaysFromArrival} days from arrival.`;
  }

  if (minDaysFromArrival != null) {
    return `Recommended timing: From ${minDaysFromArrival} days from arrival.`;
  }

  return `Recommended timing: Up to ${maxDaysFromArrival} days from arrival.`;
};

/**
 * Shared task-related type definitions
 */

/**
 * Task interface representing a task with user-specific tracking information
 * This is the shape returned by the API endpoints that join Task with UserTask data
 */
export interface Task {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  body: string;
  category: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  userTaskId?: string;
  status?: "TODO" | "SAVED" | "DONE";
  dueDate?: string | null;
  personalNotes?: string | null;
  completedAt?: string | null;
  officialLinks?: unknown;
  minDaysFromArrival?: number | null;
  maxDaysFromArrival?: number | null;
}

/**
 * Task tracking state for form controls
 * Maps between API status values and form-friendly status values
 */
export interface TaskTrackingState {
  status: "not_started" | "in_progress" | "completed";
  dueDate: string;
  personalNotes: string;
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string;
}

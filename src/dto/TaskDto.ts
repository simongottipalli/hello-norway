import { TaskCategory, EmploymentStatus } from "@/types/enums";
import {
  TITLE_MAX_LENGTH,
  SHORT_DESCRIPTION_MAX_LENGTH,
  BODY_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  DAYS_FROM_ARRIVAL_MIN,
  DAYS_FROM_ARRIVAL_MAX,
} from "@/controllers/taskValidation";

export class CreateTaskDto {
  /**
   * Task title
   * @example "Register with GP"
   * @minLength 1
   * @maxLength 140
   */
  title!: string;

  /**
   * Short description (max 280 chars)
   * @minLength 1
   * @maxLength 280
   */
  shortDescription!: string;

  /**
   * Full task body / instructions (max 50 000 chars)
   * @minLength 1
   * @maxLength 50000
   */
  body!: string;

  /**
   * Task category
   */
  category!: TaskCategory;

  /**
   * Task slug (unique identifier)
   * @example "register-gp"
   * @minLength 1
   * @maxLength 80
   */
  slug!: string;

  /**
   * Display order (PostgreSQL SmallInt, 0–32767)
   * @isInt
   * @minimum 0
   * @maximum 32767
   */
  sortOrder!: number;

  /**
   * Official links for more information
   */
  officialLinks?: unknown;

  /**
   * Whether the task is only relevant for EU citizens
   */
  requiresEU?: boolean | null;

  /**
   * Employment statuses this task applies to
   */
  requiresEmploymentStatus?: EmploymentStatus[];

  /**
   * Whether the task is only relevant for users with children
   */
  requiresChildren?: boolean | null;

  /**
   * Earliest day from arrival this task applies (can be negative)
   * @isInt
   * @minimum -32768
   * @maximum 32767
   */
  minDaysFromArrival?: number | null;

  /**
   * Latest day from arrival this task applies (can be negative)
   * @isInt
   * @minimum -32768
   * @maximum 32767
   */
  maxDaysFromArrival?: number | null;
}

/**
 * Canonical status values accepted by the API.
 * Legacy aliases (todo / saved / done) map to the same underlying states.
 */
export enum TaskStatusValue {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  TODO = "todo",
  SAVED = "saved",
  DONE = "done",
}

export class UpdateTaskStatusDto {
  /**
   * Task status
   * @example "not_started"
   */
  status!: TaskStatusValue;

  /**
   * Optional due date (YYYY-MM-DD)
   * @example "2024-12-31"
   */
  dueDate?: string | null;

  /**
   * Optional personal notes
   * @example "Called and booked appointment"
   */
  personalNotes?: string | null;
}

// Re-export constants so that consumers can reference them without importing taskValidation directly.
export {
  TITLE_MAX_LENGTH,
  SHORT_DESCRIPTION_MAX_LENGTH,
  BODY_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  DAYS_FROM_ARRIVAL_MIN,
  DAYS_FROM_ARRIVAL_MAX,
};

import { TaskCategory, EmploymentStatus, EMPLOYMENT_STATUS_VALUES } from "../types/enums";

// ──────────────────────────────────────────────
// Constants (aligned with prisma/schema.prisma)
// ──────────────────────────────────────────────

export const SLUG_MAX_LENGTH = 80;
export const TITLE_MAX_LENGTH = 140;
export const SHORT_DESCRIPTION_MAX_LENGTH = 280;
export const BODY_MAX_LENGTH = 50000;

// sortOrder is PostgreSQL SmallInt (signed 16-bit, non-negative)
export const SORT_ORDER_MIN = 0;
export const SORT_ORDER_MAX = 32767;

// minDaysFromArrival / maxDaysFromArrival are also SmallInt but can be negative (before arrival)
export const DAYS_FROM_ARRIVAL_MIN = -32768;
export const DAYS_FROM_ARRIVAL_MAX = 32767;

export const VALID_TASK_CATEGORIES = new Set<string>(Object.values(TaskCategory));
export const VALID_EMPLOYMENT_STATUSES = new Set<string>(EMPLOYMENT_STATUS_VALUES);

// ──────────────────────────────────────────────
// Primitive validators
// ──────────────────────────────────────────────

/**
 * Validates that a value is a non-empty string within the given max length.
 * Returns an error message on failure, or null on success.
 */
const validateStringField = (
  name: string,
  value: unknown,
  maxLength: number,
): string | null => {
  if (typeof value !== "string" || !value) {
    return `${name} must be a non-empty string`;
  }
  if (value.length > maxLength) {
    return `${name} must not exceed ${maxLength} characters`;
  }
  return null;
};

/**
 * Validates that a value is an integer within [min, max].
 * Returns an error message on failure, or null on success.
 */
const validateIntegerField = (
  name: string,
  value: unknown,
  min: number,
  max: number,
): string | null => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    return `${name} must be an integer between ${min} and ${max}`;
  }
  return null;
};

// ──────────────────────────────────────────────
// Per-field task validators
// Shared by both validateCreateTaskBody and validateUpdateTaskFields.
// ──────────────────────────────────────────────

const validateTaskSlug = (v: unknown): string | null =>
  validateStringField("slug", v, SLUG_MAX_LENGTH);

const validateTaskTitle = (v: unknown): string | null =>
  validateStringField("title", v, TITLE_MAX_LENGTH);

const validateTaskShortDescription = (v: unknown): string | null =>
  validateStringField("shortDescription", v, SHORT_DESCRIPTION_MAX_LENGTH);

const validateTaskBody = (v: unknown): string | null =>
  validateStringField("body", v, BODY_MAX_LENGTH);

const validateTaskCategory = (v: unknown): string | null => {
  if (typeof v !== "string" || !VALID_TASK_CATEGORIES.has(v)) {
    return `Invalid category. Must be one of: ${[...VALID_TASK_CATEGORIES].join(", ")}`;
  }
  return null;
};

const validateTaskSortOrder = (v: unknown): string | null =>
  validateIntegerField("sortOrder", v, SORT_ORDER_MIN, SORT_ORDER_MAX);

/**
 * Validates an optional boolean-or-null field (requiresEU, requiresChildren).
 * undefined is accepted (field not provided); null is accepted (explicit null).
 */
const validateTaskBooleanNullField = (name: string, v: unknown): string | null => {
  if (v !== undefined && v !== null && typeof v !== "boolean") {
    return `${name} must be a boolean or null`;
  }
  return null;
};

/**
 * Validates an optional SmallInt days-from-arrival field.
 * Allows negative values (before arrival). null/undefined are accepted.
 */
const validateTaskDaysFromArrivalField = (name: string, v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  const err = validateIntegerField(name, v, DAYS_FROM_ARRIVAL_MIN, DAYS_FROM_ARRIVAL_MAX);
  return err ? `${err} or null` : null;
};

/**
 * Validates an array of employment status values.
 * The array itself must already be confirmed to be an array before calling.
 */
const validateTaskEmploymentStatusArray = (v: unknown[]): string | null => {
  if (!v.every((s: unknown) => typeof s === "string" && VALID_EMPLOYMENT_STATUSES.has(s as string))) {
    return "requiresEmploymentStatus must be an array of valid employment status values";
  }
  return null;
};

// ──────────────────────────────────────────────
// Create-task payload type & validator
// ──────────────────────────────────────────────

export type CreateTaskPayload = {
  slug: string;
  title: string;
  shortDescription: string;
  body: string;
  category: TaskCategory;
  sortOrder: number;
  officialLinks?: unknown;
  requiresEU?: boolean | null;
  requiresEmploymentStatus: EmploymentStatus[];
  requiresChildren?: boolean | null;
  minDaysFromArrival?: number | null;
  maxDaysFromArrival?: number | null;
};

/**
 * Validates the request body for POST /api/tasks.
 *
 * Returns `{ error: string }` on the first validation failure,
 * or `{ data: CreateTaskPayload }` on success with a normalized payload
 * (requiresEmploymentStatus is always an EmploymentStatus array).
 */
export function validateCreateTaskBody(
  input: unknown,
): { error: string } | { data: CreateTaskPayload } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object" };
  }

  const body = input as Record<string, unknown>;

  const {
    slug, title, shortDescription, body: taskBody, category, sortOrder,
    officialLinks, requiresEU, requiresEmploymentStatus,
    requiresChildren, minDaysFromArrival, maxDaysFromArrival,
  } = body;

  // Required field presence
  if (!slug || !title || !shortDescription || !taskBody || !category || sortOrder === undefined) {
    return { error: "Missing required fields" };
  }

  const slugErr = validateTaskSlug(slug);
  if (slugErr) return { error: slugErr };

  const titleErr = validateTaskTitle(title);
  if (titleErr) return { error: titleErr };

  const descErr = validateTaskShortDescription(shortDescription);
  if (descErr) return { error: descErr };

  const bodyErr = validateTaskBody(taskBody);
  if (bodyErr) return { error: bodyErr };

  const categoryErr = validateTaskCategory(category);
  if (categoryErr) return { error: categoryErr };

  const sortOrderErr = validateTaskSortOrder(sortOrder);
  if (sortOrderErr) return { error: sortOrderErr };

  const euErr = validateTaskBooleanNullField("requiresEU", requiresEU);
  if (euErr) return { error: euErr };

  const childrenErr = validateTaskBooleanNullField("requiresChildren", requiresChildren);
  if (childrenErr) return { error: childrenErr };

  // requiresEmploymentStatus: normalize null/undefined → []
  let normalizedRequiresEmploymentStatus: EmploymentStatus[] = [];
  if (requiresEmploymentStatus !== undefined && requiresEmploymentStatus !== null) {
    if (!Array.isArray(requiresEmploymentStatus)) {
      return { error: "requiresEmploymentStatus must be an array of valid employment status values" };
    }
    const statusErr = validateTaskEmploymentStatusArray(requiresEmploymentStatus);
    if (statusErr) return { error: statusErr };
    normalizedRequiresEmploymentStatus = requiresEmploymentStatus as EmploymentStatus[];
  }

  const minDaysErr = validateTaskDaysFromArrivalField("minDaysFromArrival", minDaysFromArrival);
  if (minDaysErr) return { error: minDaysErr };

  const maxDaysErr = validateTaskDaysFromArrivalField("maxDaysFromArrival", maxDaysFromArrival);
  if (maxDaysErr) return { error: maxDaysErr };

  if (
    minDaysFromArrival !== undefined && minDaysFromArrival !== null &&
    maxDaysFromArrival !== undefined && maxDaysFromArrival !== null &&
    (maxDaysFromArrival as number) < (minDaysFromArrival as number)
  ) {
    return { error: "maxDaysFromArrival must be greater than or equal to minDaysFromArrival" };
  }

  return {
    data: {
      slug: slug as string,
      title: title as string,
      shortDescription: shortDescription as string,
      body: taskBody as string,
      category: category as TaskCategory,
      sortOrder: sortOrder as number,
      officialLinks,
      requiresEU: requiresEU as boolean | null | undefined,
      requiresEmploymentStatus: normalizedRequiresEmploymentStatus,
      requiresChildren: requiresChildren as boolean | null | undefined,
      minDaysFromArrival: minDaysFromArrival as number | null | undefined,
      maxDaysFromArrival: maxDaysFromArrival as number | null | undefined,
    },
  };
}

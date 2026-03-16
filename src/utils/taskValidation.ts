import { TaskCategory } from "../generated/prisma/client.js";
import { EMPLOYMENT_STATUS_VALUES } from "../lib/employmentStatus";

// ──────────────────────────────────────────────
// Constants (aligned with prisma/schema.prisma)
// ──────────────────────────────────────────────

export const SLUG_MAX_LENGTH = 80;
export const TITLE_MAX_LENGTH = 140;
export const SHORT_DESCRIPTION_MAX_LENGTH = 280;
export const BODY_MAX_LENGTH = 50000;

// sortOrder is PostgreSQL SmallInt (signed 16-bit)
export const SORT_ORDER_MIN = 0;
export const SORT_ORDER_MAX = 32767;

// minDaysFromArrival / maxDaysFromArrival are also SmallInt but can be negative (before arrival)
export const DAYS_FROM_ARRIVAL_MIN = -32768;
export const DAYS_FROM_ARRIVAL_MAX = 32767;

export const VALID_TASK_CATEGORIES = new Set<string>(Object.values(TaskCategory));
export const VALID_EMPLOYMENT_STATUSES = new Set<string>(EMPLOYMENT_STATUS_VALUES);

/**
 * Fields that may be updated via PATCH /api/tasks/:id.
 * System fields (id, createdByUserId, createdAt, updatedAt) are intentionally excluded.
 */
export const TASK_UPDATABLE_FIELDS = new Set([
  "slug",
  "title",
  "shortDescription",
  "body",
  "category",
  "sortOrder",
  "officialLinks",
  "requiresEU",
  "requiresEmploymentStatus",
  "requiresChildren",
  "minDaysFromArrival",
  "maxDaysFromArrival",
]);

// ──────────────────────────────────────────────
// Shared primitive validators
// ──────────────────────────────────────────────

/**
 * Validates that a value is a non-empty string within the given max length.
 * Returns an error message string on failure, or null on success.
 */
export const validateStringField = (
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
 * Validates that a value is a SmallInt-range integer.
 * Returns an error message string on failure, or null on success.
 */
export const validateIntegerField = (
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
// Create-task payload types & validation
// ──────────────────────────────────────────────

export type CreateTaskPayload = {
  slug: string;
  title: string;
  shortDescription: string;
  body: string;
  category: string;
  sortOrder: number;
  officialLinks?: unknown;
  requiresEU?: boolean | null;
  requiresEmploymentStatus: string[];
  requiresChildren?: boolean | null;
  minDaysFromArrival?: number | null;
  maxDaysFromArrival?: number | null;
};

/**
 * Validates the request body for POST /api/tasks.
 *
 * Returns `{ error: string }` on the first validation failure,
 * or `{ data: CreateTaskPayload }` on success with a normalized payload
 * (e.g. requiresEmploymentStatus is always an array).
 */
export function validateCreateTaskBody(
  input: unknown,
): { error: string } | { data: CreateTaskPayload } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object" };
  }

  const body = input as Record<string, unknown>;

  const { slug, title, shortDescription, body: taskBody, category, sortOrder,
          officialLinks, requiresEU, requiresEmploymentStatus,
          requiresChildren, minDaysFromArrival, maxDaysFromArrival } = body;

  // Required field presence
  if (!slug || !title || !shortDescription || !taskBody || !category || sortOrder === undefined) {
    return { error: "Missing required fields" };
  }

  // Type + length: string fields
  const slugErr = validateStringField("slug", slug, SLUG_MAX_LENGTH);
  if (slugErr) return { error: slugErr };

  const titleErr = validateStringField("title", title, TITLE_MAX_LENGTH);
  if (titleErr) return { error: titleErr };

  const descErr = validateStringField("shortDescription", shortDescription, SHORT_DESCRIPTION_MAX_LENGTH);
  if (descErr) return { error: descErr };

  const bodyErr = validateStringField("body", taskBody, BODY_MAX_LENGTH);
  if (bodyErr) return { error: bodyErr };

  // Category enum
  if (typeof category !== "string" || !VALID_TASK_CATEGORIES.has(category)) {
    return { error: `Invalid category. Must be one of: ${[...VALID_TASK_CATEGORIES].join(", ")}` };
  }

  // sortOrder integer + SmallInt range
  const sortOrderErr = validateIntegerField("sortOrder", sortOrder, SORT_ORDER_MIN, SORT_ORDER_MAX);
  if (sortOrderErr) return { error: sortOrderErr };

  // Optional: requiresEU
  if (requiresEU !== undefined && requiresEU !== null && typeof requiresEU !== "boolean") {
    return { error: "requiresEU must be a boolean or null" };
  }

  // Optional: requiresChildren
  if (requiresChildren !== undefined && requiresChildren !== null && typeof requiresChildren !== "boolean") {
    return { error: "requiresChildren must be a boolean or null" };
  }

  // Optional: requiresEmploymentStatus — normalize null/undefined → []
  let normalizedRequiresEmploymentStatus: string[] = [];
  if (requiresEmploymentStatus !== undefined && requiresEmploymentStatus !== null) {
    if (
      !Array.isArray(requiresEmploymentStatus) ||
      !requiresEmploymentStatus.every(
        (s: unknown) => typeof s === "string" && VALID_EMPLOYMENT_STATUSES.has(s),
      )
    ) {
      return {
        error: "requiresEmploymentStatus must be an array of valid employment status values",
      };
    }
    normalizedRequiresEmploymentStatus = requiresEmploymentStatus as string[];
  }

  // Optional: minDaysFromArrival
  if (minDaysFromArrival !== undefined && minDaysFromArrival !== null) {
    const minErr = validateIntegerField(
      "minDaysFromArrival",
      minDaysFromArrival,
      DAYS_FROM_ARRIVAL_MIN,
      DAYS_FROM_ARRIVAL_MAX,
    );
    if (minErr) return { error: `${minErr} or null` };
  }

  // Optional: maxDaysFromArrival
  if (maxDaysFromArrival !== undefined && maxDaysFromArrival !== null) {
    const maxErr = validateIntegerField(
      "maxDaysFromArrival",
      maxDaysFromArrival,
      DAYS_FROM_ARRIVAL_MIN,
      DAYS_FROM_ARRIVAL_MAX,
    );
    if (maxErr) return { error: `${maxErr} or null` };

    if (
      minDaysFromArrival !== undefined &&
      minDaysFromArrival !== null &&
      (maxDaysFromArrival as number) < (minDaysFromArrival as number)
    ) {
      return { error: "maxDaysFromArrival must be greater than or equal to minDaysFromArrival" };
    }
  }

  return {
    data: {
      slug: slug as string,
      title: title as string,
      shortDescription: shortDescription as string,
      body: taskBody as string,
      category: category as string,
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

// ──────────────────────────────────────────────
// Update-task payload types & validation
// ──────────────────────────────────────────────

/**
 * Extracts and validates the fields from a PATCH /api/tasks/:id request body.
 *
 * - Filters out non-updatable / system fields using TASK_UPDATABLE_FIELDS.
 * - Validates types, ranges, and enum values for any field that is present.
 * - Cross-field min/max check is performed by the caller once existing DB values are known.
 *
 * Returns `{ error: string }` on the first failure or
 * `{ data: Record<string, unknown> }` with the allowlisted, validated update payload.
 */
export function validateUpdateTaskFields(
  input: unknown,
): { error: string } | { data: Record<string, unknown> } {
  if (input === null || input === undefined || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object" };
  }

  const body = input as Record<string, unknown>;

  // Strip system / unknown fields
  const updateData: Record<string, unknown> = {};
  for (const field of TASK_UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { error: "No valid fields to update" };
  }

  // Per-field validation
  if ("slug" in updateData) {
    const err = validateStringField("slug", updateData.slug, SLUG_MAX_LENGTH);
    if (err) return { error: err };
  }
  if ("title" in updateData) {
    const err = validateStringField("title", updateData.title, TITLE_MAX_LENGTH);
    if (err) return { error: err };
  }
  if ("shortDescription" in updateData) {
    const err = validateStringField("shortDescription", updateData.shortDescription, SHORT_DESCRIPTION_MAX_LENGTH);
    if (err) return { error: err };
  }
  if ("body" in updateData) {
    const err = validateStringField("body", updateData.body, BODY_MAX_LENGTH);
    if (err) return { error: err };
  }
  if ("category" in updateData) {
    if (
      typeof updateData.category !== "string" ||
      !VALID_TASK_CATEGORIES.has(updateData.category as string)
    ) {
      return {
        error: `Invalid category. Must be one of: ${[...VALID_TASK_CATEGORIES].join(", ")}`,
      };
    }
  }
  if ("sortOrder" in updateData) {
    const err = validateIntegerField("sortOrder", updateData.sortOrder, SORT_ORDER_MIN, SORT_ORDER_MAX);
    if (err) return { error: err };
  }
  if ("requiresEU" in updateData && updateData.requiresEU !== null && typeof updateData.requiresEU !== "boolean") {
    return { error: "requiresEU must be a boolean or null" };
  }
  if ("requiresChildren" in updateData && updateData.requiresChildren !== null && typeof updateData.requiresChildren !== "boolean") {
    return { error: "requiresChildren must be a boolean or null" };
  }
  if ("requiresEmploymentStatus" in updateData) {
    const statusArray = updateData.requiresEmploymentStatus;
    if (statusArray === null) {
      return { error: "requiresEmploymentStatus cannot be null" };
    }
    if (
      !Array.isArray(statusArray) ||
      !(statusArray as unknown[]).every(
        (s) => typeof s === "string" && VALID_EMPLOYMENT_STATUSES.has(s as string),
      )
    ) {
      return { error: "requiresEmploymentStatus must be an array of valid employment status values" };
    }
  }
  if ("minDaysFromArrival" in updateData && updateData.minDaysFromArrival !== null) {
    const err = validateIntegerField(
      "minDaysFromArrival",
      updateData.minDaysFromArrival,
      DAYS_FROM_ARRIVAL_MIN,
      DAYS_FROM_ARRIVAL_MAX,
    );
    if (err) return { error: `${err} or null` };
  }
  if ("maxDaysFromArrival" in updateData && updateData.maxDaysFromArrival !== null) {
    const err = validateIntegerField(
      "maxDaysFromArrival",
      updateData.maxDaysFromArrival,
      DAYS_FROM_ARRIVAL_MIN,
      DAYS_FROM_ARRIVAL_MAX,
    );
    if (err) return { error: `${err} or null` };
  }

  return { data: updateData };
}

/**
 * Cross-field constraint: validates that maxDaysFromArrival >= minDaysFromArrival,
 * using the existing DB values for any field that wasn't included in the update payload.
 *
 * Returns an error message string on failure, or null on success.
 */
export function validateDaysFromArrivalRange(
  updateData: Record<string, unknown>,
  existingMinDays: number | null,
  existingMaxDays: number | null,
): string | null {
  const effectiveMin =
    "minDaysFromArrival" in updateData
      ? (updateData.minDaysFromArrival as number | null)
      : existingMinDays;
  const effectiveMax =
    "maxDaysFromArrival" in updateData
      ? (updateData.maxDaysFromArrival as number | null)
      : existingMaxDays;

  if (
    effectiveMin !== null &&
    effectiveMax !== null &&
    effectiveMin !== undefined &&
    effectiveMax !== undefined &&
    effectiveMax < effectiveMin
  ) {
    return "maxDaysFromArrival must be greater than or equal to minDaysFromArrival";
  }
  return null;
}

import { describe, it, expect } from "vitest";
import {
  validateStringField,
  validateIntegerField,
  validateTaskSlug,
  validateTaskTitle,
  validateTaskShortDescription,
  validateTaskBody,
  validateTaskCategory,
  validateTaskSortOrder,
  validateTaskBooleanNullField,
  validateTaskDaysFromArrivalField,
  validateTaskEmploymentStatusArray,
  validateCreateTaskBody,
  validateUpdateTaskFields,
  validateDaysFromArrivalRange,
  SLUG_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  SHORT_DESCRIPTION_MAX_LENGTH,
  BODY_MAX_LENGTH,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  DAYS_FROM_ARRIVAL_MIN,
  DAYS_FROM_ARRIVAL_MAX,
} from "../controllers/taskValidation";

// ──────────────────────────────────────────────
// validateStringField
// ──────────────────────────────────────────────

describe("validateStringField", () => {
  it("returns null for a valid non-empty string within max length", () => {
    expect(validateStringField("slug", "my-slug", 100)).toBeNull();
  });

  it("returns an error when value is not a string", () => {
    expect(validateStringField("slug", 123, 100)).toContain("slug");
  });

  it("returns an error for an empty string", () => {
    expect(validateStringField("title", "", 100)).toContain("title");
  });

  it("returns an error when string exceeds max length", () => {
    const longValue = "a".repeat(101);
    expect(validateStringField("title", longValue, 100)).toContain("100 characters");
  });

  it("returns null for a string exactly at max length", () => {
    const exactMax = "a".repeat(100);
    expect(validateStringField("title", exactMax, 100)).toBeNull();
  });
});

// ──────────────────────────────────────────────
// validateIntegerField
// ──────────────────────────────────────────────

describe("validateIntegerField", () => {
  it("returns null for an integer within range", () => {
    expect(validateIntegerField("sortOrder", 100, 0, 32767)).toBeNull();
  });

  it("returns an error for a float", () => {
    expect(validateIntegerField("sortOrder", 1.5, 0, 32767)).toContain("sortOrder");
  });

  it("returns an error for a non-number", () => {
    expect(validateIntegerField("sortOrder", "high", 0, 32767)).toContain("sortOrder");
  });

  it("returns an error when below min", () => {
    expect(validateIntegerField("sortOrder", -1, 0, 32767)).toContain("0 and 32767");
  });

  it("returns an error when above max", () => {
    expect(validateIntegerField("sortOrder", 40000, 0, 32767)).toContain("0 and 32767");
  });

  it("returns null at exact min and max boundaries", () => {
    expect(validateIntegerField("val", 0, 0, 32767)).toBeNull();
    expect(validateIntegerField("val", 32767, 0, 32767)).toBeNull();
  });
});

// ──────────────────────────────────────────────
// Per-field task validators
// ──────────────────────────────────────────────

describe("per-field task validators", () => {
  it("validateTaskSlug rejects values over the slug limit", () => {
    expect(validateTaskSlug("a".repeat(SLUG_MAX_LENGTH + 1))).not.toBeNull();
    expect(validateTaskSlug("valid-slug")).toBeNull();
  });

  it("validateTaskTitle rejects values over the title limit", () => {
    expect(validateTaskTitle("a".repeat(TITLE_MAX_LENGTH + 1))).not.toBeNull();
    expect(validateTaskTitle("Valid Title")).toBeNull();
  });

  it("validateTaskShortDescription rejects values over the short description limit", () => {
    expect(validateTaskShortDescription("a".repeat(SHORT_DESCRIPTION_MAX_LENGTH + 1))).not.toBeNull();
    expect(validateTaskShortDescription("A description")).toBeNull();
  });

  it("validateTaskBody rejects values over the body limit", () => {
    expect(validateTaskBody("a".repeat(BODY_MAX_LENGTH + 1))).not.toBeNull();
    expect(validateTaskBody("Body content")).toBeNull();
  });

  it("validateTaskCategory rejects invalid values", () => {
    expect(validateTaskCategory("INVALID")).not.toBeNull();
    expect(validateTaskCategory("OTHER")).toBeNull();
  });

  it("validateTaskSortOrder rejects out-of-range values", () => {
    expect(validateTaskSortOrder(SORT_ORDER_MAX + 1)).not.toBeNull();
    expect(validateTaskSortOrder(1.5)).not.toBeNull();
    expect(validateTaskSortOrder(SORT_ORDER_MIN)).toBeNull();
  });

  it("validateTaskBooleanNullField accepts boolean, null, undefined", () => {
    expect(validateTaskBooleanNullField("requiresEU", true)).toBeNull();
    expect(validateTaskBooleanNullField("requiresEU", false)).toBeNull();
    expect(validateTaskBooleanNullField("requiresEU", null)).toBeNull();
    expect(validateTaskBooleanNullField("requiresEU", undefined)).toBeNull();
    expect(validateTaskBooleanNullField("requiresEU", "yes")).not.toBeNull();
  });

  it("validateTaskDaysFromArrivalField accepts null/undefined and valid integers incl. negatives", () => {
    expect(validateTaskDaysFromArrivalField("minDaysFromArrival", null)).toBeNull();
    expect(validateTaskDaysFromArrivalField("minDaysFromArrival", undefined)).toBeNull();
    expect(validateTaskDaysFromArrivalField("minDaysFromArrival", -30)).toBeNull();
    expect(validateTaskDaysFromArrivalField("minDaysFromArrival", DAYS_FROM_ARRIVAL_MIN - 1)).not.toBeNull();
    expect(validateTaskDaysFromArrivalField("maxDaysFromArrival", DAYS_FROM_ARRIVAL_MAX + 1)).not.toBeNull();
  });

  it("validateTaskEmploymentStatusArray accepts valid statuses and rejects invalid", () => {
    expect(validateTaskEmploymentStatusArray(["EMPLOYED", "STUDENT"])).toBeNull();
    expect(validateTaskEmploymentStatusArray(["FREELANCER"])).not.toBeNull();
    expect(validateTaskEmploymentStatusArray([])).toBeNull();
  });
});

// ──────────────────────────────────────────────
// validateCreateTaskBody
// ──────────────────────────────────────────────

const VALID_CREATE_BODY = {
  slug: "test-task",
  title: "Test Task",
  shortDescription: "A short description",
  body: "The full body text",
  category: "OTHER",
  sortOrder: 100,
};

describe("validateCreateTaskBody", () => {
  describe("body type guard", () => {
    it("returns error for null body", () => {
      const result = validateCreateTaskBody(null);
      expect("error" in result).toBe(true);
      if ("error" in result) expect(result.error).toContain("JSON object");
    });

    it("returns error for array body", () => {
      const result = validateCreateTaskBody([]);
      expect("error" in result).toBe(true);
    });

    it("returns error for string body", () => {
      const result = validateCreateTaskBody("string");
      expect("error" in result).toBe(true);
    });
  });

  describe("required fields", () => {
    it("returns error when slug is missing", () => {
      const { slug: _slug, ...rest } = VALID_CREATE_BODY;
      const result = validateCreateTaskBody(rest);
      expect("error" in result).toBe(true);
      if ("error" in result) expect(result.error).toContain("Missing required fields");
    });

    it("returns error when sortOrder is missing", () => {
      const { sortOrder: _sortOrder, ...rest } = VALID_CREATE_BODY;
      const result = validateCreateTaskBody(rest);
      expect("error" in result).toBe(true);
    });
  });

  describe("string field length limits", () => {
    it(`returns error when slug exceeds ${SLUG_MAX_LENGTH} characters`, () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, slug: "a".repeat(SLUG_MAX_LENGTH + 1) });
      expect("error" in result).toBe(true);
      if ("error" in result) expect(result.error).toContain("slug");
    });

    it(`returns error when title exceeds ${TITLE_MAX_LENGTH} characters`, () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, title: "a".repeat(TITLE_MAX_LENGTH + 1) });
      expect("error" in result).toBe(true);
    });

    it(`returns error when shortDescription exceeds ${SHORT_DESCRIPTION_MAX_LENGTH} characters`, () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, shortDescription: "a".repeat(SHORT_DESCRIPTION_MAX_LENGTH + 1) });
      expect("error" in result).toBe(true);
    });

    it(`returns error when body exceeds ${BODY_MAX_LENGTH} characters`, () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, body: "a".repeat(BODY_MAX_LENGTH + 1) });
      expect("error" in result).toBe(true);
    });
  });

  describe("category", () => {
    it("accepts all valid TaskCategory values", () => {
      const validCategories = ["ARRIVAL", "IDENTITY_BANKING", "HEALTH", "TAX_WORK", "FAMILY", "HOUSING", "DRIVING", "OTHER"];
      for (const cat of validCategories) {
        const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, category: cat });
        expect("data" in result).toBe(true);
      }
    });
  });

  describe("sortOrder", () => {
    it("returns error when sortOrder is a float", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, sortOrder: 1.5 });
      expect("error" in result).toBe(true);
    });

    it("accepts sortOrder at boundary values", () => {
      expect("data" in validateCreateTaskBody({ ...VALID_CREATE_BODY, sortOrder: SORT_ORDER_MIN })).toBe(true);
      expect("data" in validateCreateTaskBody({ ...VALID_CREATE_BODY, sortOrder: SORT_ORDER_MAX })).toBe(true);
    });
  });

  describe("requiresEU / requiresChildren", () => {
    it("returns error when requiresChildren is not a boolean", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, requiresChildren: 1 });
      expect("error" in result).toBe(true);
    });

    it("accepts null for requiresEU and requiresChildren", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, requiresEU: null, requiresChildren: null });
      expect("data" in result).toBe(true);
    });
  });

  describe("requiresEmploymentStatus", () => {
    it("normalizes null to an empty array", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, requiresEmploymentStatus: null });
      expect("data" in result).toBe(true);
      if ("data" in result) expect(result.data.requiresEmploymentStatus).toEqual([]);
    });

    it("normalizes undefined to an empty array", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY });
      expect("data" in result).toBe(true);
      if ("data" in result) expect(result.data.requiresEmploymentStatus).toEqual([]);
    });

    it("accepts a valid array of employment status values", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, requiresEmploymentStatus: ["EMPLOYED", "STUDENT"] });
      expect("data" in result).toBe(true);
    });
  });

  describe("minDaysFromArrival / maxDaysFromArrival", () => {
    it("accepts negative values (before-arrival window)", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, minDaysFromArrival: -30, maxDaysFromArrival: 30 });
      expect("data" in result).toBe(true);
    });

    it(`returns error when minDaysFromArrival is below ${DAYS_FROM_ARRIVAL_MIN}`, () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, minDaysFromArrival: DAYS_FROM_ARRIVAL_MIN - 1 });
      expect("error" in result).toBe(true);
    });

    it(`returns error when maxDaysFromArrival exceeds ${DAYS_FROM_ARRIVAL_MAX}`, () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, maxDaysFromArrival: DAYS_FROM_ARRIVAL_MAX + 1 });
      expect("error" in result).toBe(true);
    });

    it("returns error when max < min", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, minDaysFromArrival: 10, maxDaysFromArrival: 5 });
      expect("error" in result).toBe(true);
      if ("error" in result) expect(result.error).toContain("maxDaysFromArrival");
    });

    it("accepts null for both fields", () => {
      const result = validateCreateTaskBody({ ...VALID_CREATE_BODY, minDaysFromArrival: null, maxDaysFromArrival: null });
      expect("data" in result).toBe(true);
    });
  });

  describe("success path", () => {
    it("returns the normalized payload for a minimal valid body", () => {
      const result = validateCreateTaskBody(VALID_CREATE_BODY);
      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.slug).toBe(VALID_CREATE_BODY.slug);
        expect(result.data.requiresEmploymentStatus).toEqual([]);
      }
    });
  });
});

// ──────────────────────────────────────────────
// validateUpdateTaskFields
// ──────────────────────────────────────────────

describe("validateUpdateTaskFields", () => {
  it("returns error for a non-object body", () => {
    const result = validateUpdateTaskFields(null);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("JSON object");
  });

  it("returns error when no valid fields are present", () => {
    const result = validateUpdateTaskFields({ id: "hack", createdByUserId: "attacker" });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("No valid fields");
  });

  it("strips system fields from the update payload", () => {
    const result = validateUpdateTaskFields({ title: "New Title", id: "hacked", createdByUserId: "attacker" });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data).toHaveProperty("title", "New Title");
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("createdByUserId");
    }
  });

  it("returns error when requiresEmploymentStatus is null", () => {
    const result = validateUpdateTaskFields({ requiresEmploymentStatus: null });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("requiresEmploymentStatus");
  });

  it("accepts negative minDaysFromArrival (before-arrival window)", () => {
    const result = validateUpdateTaskFields({ minDaysFromArrival: -14 });
    expect("data" in result).toBe(true);
  });

  it(`returns error when minDaysFromArrival is below ${DAYS_FROM_ARRIVAL_MIN}`, () => {
    const result = validateUpdateTaskFields({ minDaysFromArrival: DAYS_FROM_ARRIVAL_MIN - 1 });
    expect("error" in result).toBe(true);
  });

  it(`returns error when maxDaysFromArrival exceeds ${DAYS_FROM_ARRIVAL_MAX}`, () => {
    const result = validateUpdateTaskFields({ maxDaysFromArrival: DAYS_FROM_ARRIVAL_MAX + 1 });
    expect("error" in result).toBe(true);
  });

  it("returns a cleaned data object for a valid partial update", () => {
    const result = validateUpdateTaskFields({ title: "Updated", sortOrder: 5 });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data).toEqual({ title: "Updated", sortOrder: 5 });
    }
  });
});

// ──────────────────────────────────────────────
// validateDaysFromArrivalRange
// ──────────────────────────────────────────────

describe("validateDaysFromArrivalRange", () => {
  it("returns null when both effective values are null", () => {
    expect(validateDaysFromArrivalRange({}, null, null)).toBeNull();
  });

  it("returns null when effective max >= effective min", () => {
    expect(validateDaysFromArrivalRange({ minDaysFromArrival: 5, maxDaysFromArrival: 10 }, null, null)).toBeNull();
  });

  it("returns error when effective max < effective min (both from payload)", () => {
    const result = validateDaysFromArrivalRange({ minDaysFromArrival: 10, maxDaysFromArrival: 5 }, null, null);
    expect(result).not.toBeNull();
    expect(result).toContain("maxDaysFromArrival");
  });

  it("uses existing DB min when only max is being updated", () => {
    // Existing min = 10, updating max to 5 → violation
    const result = validateDaysFromArrivalRange({ maxDaysFromArrival: 5 }, 10, 20);
    expect(result).not.toBeNull();
  });

  it("uses existing DB max when only min is being updated", () => {
    // Existing max = 5, updating min to 10 → violation
    const result = validateDaysFromArrivalRange({ minDaysFromArrival: 10 }, 1, 5);
    expect(result).not.toBeNull();
  });

  it("returns null when one side is null (constraint not applicable)", () => {
    expect(validateDaysFromArrivalRange({ minDaysFromArrival: null }, null, 20)).toBeNull();
    expect(validateDaysFromArrivalRange({ maxDaysFromArrival: null }, 5, null)).toBeNull();
  });

  it("works correctly with negative before-arrival values", () => {
    // min = -30, max = -5 → valid
    expect(validateDaysFromArrivalRange({ minDaysFromArrival: -30, maxDaysFromArrival: -5 }, null, null)).toBeNull();
    // min = -5, max = -30 → violation
    const result = validateDaysFromArrivalRange({ minDaysFromArrival: -5, maxDaysFromArrival: -30 }, null, null);
    expect(result).not.toBeNull();
  });
});

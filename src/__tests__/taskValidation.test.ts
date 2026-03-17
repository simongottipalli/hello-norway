import { describe, it, expect } from "vitest";
import {
  validateCreateTaskBody,
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

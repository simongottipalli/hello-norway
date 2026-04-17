import { EmploymentStatus, TaskCategory } from "../types/enums";

export class OnboardingProfileDto {
  /**
   * Is the user from an EU country?
   * @example true
   */
  isEU?: boolean | null;

  /**
   * Does the user have children?
   * @example false
   */
  hasChildren?: boolean | null;

  /**
   * User's employment status
   * @example "EMPLOYED"
   */
  employmentStatus?: EmploymentStatus | null;

  /**
   * Arrival date in Norway (YYYY-MM-DD)
   * @example "2024-01-15"
   */
  arrivalDate?: string | null;

  /**
   * Planned arrival date (YYYY-MM-DD)
   * @example "2024-06-01"
   */
  plannedArrivalDate?: string | null;
}

export class OnboardingTaskPreviewDto {
  /**
   * Task identifier
   * @example "c3b2a1d0-0000-4000-8000-000000000001"
   */
  id!: string;

  /**
   * Task title
   * @example "Register with the police"
   */
  title!: string;

  /**
   * Short description shown in previews
   * @example "Complete your initial police registration within 3 months of arrival."
   */
  shortDescription!: string | null;

  /**
   * Task category used for grouping and ordering
   * @example "ARRIVAL"
   */
  category!: TaskCategory;

  /**
   * Relative ordering within a category
   * @example 20
   */
  sortOrder!: number;
}

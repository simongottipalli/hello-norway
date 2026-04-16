import { EmploymentStatus } from "@/types/enums";

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

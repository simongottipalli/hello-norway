import { EmploymentStatus } from "@/types/enums";

export class UpdateProfileDto {
  /**
   * User's full name
   * @example "John Doe"
   * @minLength 1
   * @maxLength 255
   */
  name?: string;

  /**
   * Is the user from an EU country?
   */
  isEU?: boolean | null;

  /**
   * Does the user have children?
   */
  hasChildren?: boolean | null;

  /**
   * User's employment status
   */
  employmentStatus?: EmploymentStatus | null;

  /**
   * Arrival date in Norway (YYYY-MM-DD)
   */
  arrivalDate?: string | null;

  /**
   * Planned arrival date (YYYY-MM-DD)
   */
  plannedArrivalDate?: string | null;
}

export class SessionResponseDto {
  authenticated!: boolean;
  user!: {
    id: string;
    email: string;
    name: string | null;
  };
  session!: {
    expiresAt: Date;
  };
}

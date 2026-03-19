import type { EmploymentStatus } from "./enums";

export interface UserUpdateData {
  name?: string;
  isEU?: boolean | null;
  hasChildren?: boolean | null;
  employmentStatus?: EmploymentStatus | null;
  arrivalDate?: Date | null;
  plannedArrivalDate?: Date | null;
}

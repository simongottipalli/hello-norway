export enum TaskCategory {
  ARRIVAL = "ARRIVAL",
  IDENTITY_BANKING = "IDENTITY_BANKING",
  HEALTH = "HEALTH",
  TAX_WORK = "TAX_WORK",
  FAMILY = "FAMILY",
  HOUSING = "HOUSING",
  DRIVING = "DRIVING",
  OTHER = "OTHER",
}

export enum EmploymentStatus {
  EMPLOYED = "EMPLOYED",
  SELF_EMPLOYED = "SELF_EMPLOYED",
  UNEMPLOYED = "UNEMPLOYED",
  STUDENT = "STUDENT",
  OTHER = "OTHER",
}

export enum UserTaskStatus {
  TODO = "TODO",
  SAVED = "SAVED",
  DONE = "DONE",
}

export enum HousingType {
  RENT = "RENT",
  OWN = "OWN",
  LIVES_WITH_FAMILY = "LIVES_WITH_FAMILY",
  OTHER = "OTHER",
}

export const EMPLOYMENT_STATUS_VALUES = Object.values(EmploymentStatus);
export type EmploymentStatusValue = (typeof EMPLOYMENT_STATUS_VALUES)[number];

export const EMPLOYMENT_STATUS_OPTIONS: Array<{ value: EmploymentStatus; label: string }> = [
  { value: EmploymentStatus.EMPLOYED, label: "Employed" },
  { value: EmploymentStatus.STUDENT, label: "Student" },
  { value: EmploymentStatus.UNEMPLOYED, label: "Unemployed" },
  { value: EmploymentStatus.SELF_EMPLOYED, label: "Self-employed" },
  { value: EmploymentStatus.OTHER, label: "Other" },
];

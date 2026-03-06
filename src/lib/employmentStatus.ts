export const EMPLOYMENT_STATUS_VALUES = [
  "EMPLOYED",
  "SELF_EMPLOYED",
  "UNEMPLOYED",
  "STUDENT",
  "OTHER",
] as const;

export type EmploymentStatusValue = (typeof EMPLOYMENT_STATUS_VALUES)[number];

export const EMPLOYMENT_STATUS_OPTIONS: Array<{ value: EmploymentStatusValue; label: string }> = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "STUDENT", label: "Student" },
  { value: "UNEMPLOYED", label: "Unemployed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "OTHER", label: "Other" },
];

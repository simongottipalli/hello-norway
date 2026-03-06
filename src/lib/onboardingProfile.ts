type OnboardingAnswers = Record<string, string>;

type EmploymentStatus = "EMPLOYED" | "SELF_EMPLOYED" | "UNEMPLOYED" | "STUDENT" | "OTHER";

export type OnboardingTaskProfile = {
  isEU: boolean | null;
  hasChildren: boolean | null;
  employmentStatus: EmploymentStatus | null;
  arrivalDate: string | null;
  plannedArrivalDate: string | null;
};

export type OnboardingTaskPreview = {
  id: string;
  title: string;
  shortDescription: string;
  category: string;
  sortOrder: number;
};

export const ONBOARDING_PROFILE_STORAGE_KEY = "onboarding-task-profile";
const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  "EMPLOYED",
  "SELF_EMPLOYED",
  "UNEMPLOYED",
  "STUDENT",
  "OTHER",
];
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const EU_EEA_COUNTRIES = new Set([
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Ireland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
]);

const toEmploymentStatus = (
  applyingAs: string | undefined,
  jobOffer: string | undefined,
): EmploymentStatus | null => {
  if (!applyingAs) {
    return null;
  }

  if (applyingAs === "Student") {
    return "STUDENT";
  }

  if (applyingAs === "Skilled worker") {
    return jobOffer === "No" ? "UNEMPLOYED" : "EMPLOYED";
  }

  return "OTHER";
};

const normalizeCountries = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const deriveTaskProfileFromOnboardingAnswers = (
  answers: OnboardingAnswers,
): OnboardingTaskProfile => {
  const citizenships = normalizeCountries(answers.citizenships);
  const applyingFrom = answers.applyingFrom?.trim();
  const hasEuContext = [...citizenships, applyingFrom].some(
    (country): country is string => Boolean(country) && EU_EEA_COUNTRIES.has(country),
  );

  return {
    isEU: hasEuContext,
    hasChildren: null,
    employmentStatus: toEmploymentStatus(answers.applyingAs, answers.jobOffer),
    arrivalDate: null,
    plannedArrivalDate: null,
  };
};

export const buildFallbackTaskPreview = (
  profile: OnboardingTaskProfile,
): OnboardingTaskPreview[] => {
  const tasks: OnboardingTaskPreview[] = [
    {
      id: "fallback-book-appointments",
      title: "Book authority appointments early",
      shortDescription: "Reserve appointments with SUA, police, and tax office as early as possible.",
      category: "ARRIVAL",
      sortOrder: 10,
    },
    {
      id: "fallback-address-registration",
      title: "Register your address in Norway",
      shortDescription: "Report your move so mail and public services are connected to your correct address.",
      category: "ARRIVAL",
      sortOrder: 20,
    },
  ];

  if (profile.isEU) {
    tasks.unshift({
      id: "fallback-eu-registration",
      title: "Register with police as an EU/EEA citizen",
      shortDescription: "Complete your one-time EU/EEA registration with the police.",
      category: "ARRIVAL",
      sortOrder: 5,
    });
  } else {
    tasks.unshift({
      id: "fallback-permit",
      title: "Start your residence permit process",
      shortDescription: "Follow the permit process that matches your citizenship and reason for stay.",
      category: "ARRIVAL",
      sortOrder: 5,
    });
  }

  tasks.push(
    profile.employmentStatus === "EMPLOYED" || profile.employmentStatus === "SELF_EMPLOYED"
      ? {
          id: "fallback-tax-card",
          title: "Apply for a tax deduction card",
          shortDescription: "Set up your tax card before your first salary payment.",
          category: "TAX_WORK",
          sortOrder: 30,
        }
      : {
          id: "fallback-nav-membership",
          title: "Check NAV membership basics",
          shortDescription: "Understand your rights for social security and benefits in Norway.",
          category: "TAX_WORK",
          sortOrder: 30,
        },
  );

  return tasks;
};

export const sanitizeStoredOnboardingProfileForPatch = (
  storedProfile: string,
): Partial<OnboardingTaskProfile> | null => {
  try {
    const parsed = JSON.parse(storedProfile) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const payload: Partial<OnboardingTaskProfile> = {};
    const value = parsed as Record<string, unknown>;

    if (typeof value.isEU === "boolean") {
      payload.isEU = value.isEU;
    }

    if (typeof value.hasChildren === "boolean") {
      payload.hasChildren = value.hasChildren;
    }

    if (
      typeof value.employmentStatus === "string" &&
      EMPLOYMENT_STATUSES.includes(value.employmentStatus as EmploymentStatus)
    ) {
      payload.employmentStatus = value.employmentStatus as EmploymentStatus;
    }

    if (typeof value.arrivalDate === "string" && DATE_ONLY_REGEX.test(value.arrivalDate)) {
      payload.arrivalDate = value.arrivalDate;
    }

    if (
      typeof value.plannedArrivalDate === "string" &&
      DATE_ONLY_REGEX.test(value.plannedArrivalDate)
    ) {
      payload.plannedArrivalDate = value.plannedArrivalDate;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  } catch {
    return null;
  }
};

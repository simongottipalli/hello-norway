// prisma/seed.ts
import { PrismaClient, TaskCategory, EmploymentStatus } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

type Link = { label: string; url: string };

type SeedTask = {
  slug: string;
  title: string;
  shortDescription: string;
  body: string;
  category: TaskCategory;
  officialLinks: Link[];
  sortOrder: number;

  // Eligibility (nullable)
  requiresEU?: boolean | null;
  requiresEmploymentStatus?: EmploymentStatus[];
  requiresChildren?: boolean | null;

  // Timing window relative to arrival date
  // Negative = before arrival, 0 = arrival day, positive = after arrival
  minDaysFromArrival?: number | null;
  maxDaysFromArrival?: number | null;
};

const tasks: SeedTask[] = [
  // -----------------
  // BEFORE ARRIVAL / EARLY ARRIVAL
  // -----------------
  {
    slug: "prepare-documents",
    title: "Prepare key documents",
    shortDescription: "Collect IDs and paperwork you'll likely need for banking, tax, and registration.",
    body:
      "Prepare passports/IDs, residence permit documents (if relevant), work contract, marriage/birth certificates (if relevant), and any other paperwork required by authorities or banks.",
    category: "ARRIVAL",
    officialLinks: [{ label: "Want to apply (UDI)", url: "https://www.udi.no/en/want-to-apply/" }],
    minDaysFromArrival: -90,
    maxDaysFromArrival: 7,
    sortOrder: 10,
  },
  {
    slug: "check-residence-rules",
    title: "Check residence rules that apply to you (EU/EEA vs non-EU/EEA)",
    shortDescription: "Confirm what you must do to live/work in Norway legally.",
    body:
      "Rules differ depending on citizenship and purpose of stay (work, family, study). Identify your path and required steps before arriving.",
    category: "ARRIVAL",
    officialLinks: [{ label: "Want to apply (UDI)", url: "https://www.udi.no/en/want-to-apply/" }],
    minDaysFromArrival: -120,
    maxDaysFromArrival: 14,
    sortOrder: 20,
  },

  // -----------------
  // ARRIVAL
  // -----------------
  {
    slug: "register-with-police-eu-eea",
    title: "Register (EU/EEA) if staying over 3 months",
    shortDescription: "EU/EEA citizens may need to register if living in Norway longer than 3 months.",
    body:
      "If you are an EU/EEA citizen and will live in Norway for more than 3 months, you must register and receive a registration certificate.",
    category: "ARRIVAL",
    officialLinks: [
      { label: "Registration certificate (UDI)", url: "https://www.udi.no/en/word-definitions/registration-certificate-for-eueea-nationals/" },
      { label: "Residence / registration info (Police)", url: "https://www.politiet.no/en/english/residence-permits-and-protection/residence-permit-registration-or-visitor-visa/" },
    ],
    requiresEU: true,
    minDaysFromArrival: 0,
    maxDaysFromArrival: 120,
    sortOrder: 30,
  },
  {
    slug: "apply-residence-permit-non-eu",
    title: "Apply for residence permit (non-EU/EEA) for long stay/work",
    shortDescription: "Non-EU/EEA citizens usually need a permit to work or stay long-term.",
    body:
      "Non-EU/EEA citizens generally need a residence permit to work or stay longer than 90 days. Follow UDI’s steps for your permit type and any police appointment requirements.",
    category: "ARRIVAL",
    officialLinks: [
      { label: "Want to apply (UDI)", url: "https://www.udi.no/en/want-to-apply/" },
      { label: "Residence / registration info (Police)", url: "https://www.politiet.no/en/english/residence-permits-and-protection/residence-permit-registration-or-visitor-visa/" },
    ],
    requiresEU: false,
    minDaysFromArrival: -90,
    maxDaysFromArrival: 90,
    sortOrder: 40,
  },
  {
    slug: "notify-move-to-norway-national-registry",
    title: "Notify the National Population Register when moving to Norway",
    shortDescription: "If staying more than 6 months, report the move (Folkeregisteret).",
    body:
      "If you are moving to Norway for more than 6 months, you must notify the National Population Register. This is often necessary for getting a national identity number.",
    category: "ARRIVAL",
    officialLinks: [{ label: "Move to Norway (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/national-registry/moving/to-Norway/" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 60,
    sortOrder: 50,
  },
  {
    slug: "get-d-number",
    title: "Get a D-number (temporary ID number) if you need it early",
    shortDescription: "Often needed for tax, salary, banking, or other services.",
    body:
      "A D-number is a temporary Norwegian ID number. Some agencies can requisition it for you when you need to use a service and you don’t have a national identity number yet.",
    category: "ARRIVAL",
    officialLinks: [{ label: "D-number (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/national-registry/identitetsnummer-og-elektronisk-id/d-nummer/" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 90,
    sortOrder: 60,
  },
  {
    slug: "report-change-of-address",
    title: "Report change of address when you move",
    shortDescription: "Keep your registered address updated for official mail and services.",
    body:
      "When you move within Norway, notify the National Population Register. Many agencies rely on your registered address.",
    category: "ARRIVAL",
    officialLinks: [{ label: "Moving (Skatteetaten)", url: "https://www.skatteetaten.no/en/Person/National-Registry/Moving/" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 70,
  },

  // -----------------
  // IDENTITY / BANKING
  // -----------------
  {
    slug: "open-bank-account",
    title: "Open a Norwegian bank account",
    shortDescription: "Needed for salary and many payments; banks may require ID number and documentation.",
    body:
      "Banks have varying requirements. Expect identity checks and documentation. A bank account is often needed before you can get BankID.",
    category: "IDENTITY_BANKING",
    officialLinks: [{ label: "BankID (BankID.no)", url: "https://bankid.no/en" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 120,
    sortOrder: 10,
  },
  {
    slug: "get-bankid",
    title: "Get BankID (electronic ID)",
    shortDescription: "Used to log in and sign digitally across public and private services.",
    body:
      "BankID is issued by your bank. Once you have it, you can use it to access many services (tax, healthcare, banking, etc.).",
    category: "IDENTITY_BANKING",
    officialLinks: [
      { label: "How to order BankID (Digdir)", url: "https://eid.difi.no/en/bankid/how-order-bankid" },
      { label: "BankID (BankID.no)", url: "https://bankid.no/en" },
    ],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 180,
    sortOrder: 20,
  },

  // -----------------
  // TAX / WORK
  // -----------------
  {
    slug: "get-tax-deduction-card",
    title: "Get a tax deduction card (skattekort)",
    shortDescription: "Required so your employer can withhold the correct tax.",
    body:
      "If you work in Norway, you generally need a tax deduction card. Your employer uses it to deduct the correct tax from your salary.",
    category: "TAX_WORK",
    officialLinks: [
      { label: "Order tax deduction card (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/taxes/tax-deduction-card-and-advance-tax/order-a-tax-deduction-card/" },
      { label: "Tax deduction card for foreign citizens (Skatteetaten)", url: "https://www.skatteetaten.no/en/forms/tax-deduction-card-for-foreign-citizens/" },
    ],
    requiresEmploymentStatus: ["EMPLOYED", "SELF_EMPLOYED"],
    minDaysFromArrival: -14,
    maxDaysFromArrival: 60,
    sortOrder: 10,
  },
  {
    slug: "check-my-tax",
    title: "Log in to My tax (Skatteetaten)",
    shortDescription: "View tax card, tax return, and tax assessment when available.",
    body:
      "Use My tax to see your tax deduction card and later your tax return and assessment. This is your main hub for personal tax information.",
    category: "TAX_WORK",
    officialLinks: [{ label: "My tax (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/taxes/my-tax/" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 20,
  },
  {
    slug: "review-submit-tax-return",
    title: "Review and submit your tax return (next year)",
    shortDescription: "Check pre-filled numbers and submit changes by the deadline.",
    body:
      "The tax return is pre-filled. You must review it and submit changes by the deadline each year.",
    category: "TAX_WORK",
    officialLinks: [{ label: "Tax return (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/taxes/tax-return/" }],
    minDaysFromArrival: 60,
    maxDaysFromArrival: 3650,
    sortOrder: 30,
  },
  {
    slug: "nav-membership-basics",
    title: "Understand National Insurance (NAV) membership basics",
    shortDescription: "Membership affects eligibility for healthcare coverage and benefits.",
    body:
      "Membership depends on residence and/or employment. Understanding this early helps when navigating benefits and coverage.",
    category: "TAX_WORK",
    officialLinks: [{ label: "Membership (NAV)", url: "https://www.nav.no/en/home/rules-and-regulations/membership-of-the-national-insurance-scheme" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 40,
  },

  // -----------------
  // HEALTH
  // -----------------
  {
    slug: "choose-fastlege",
    title: "Choose / change your GP (fastlege)",
    shortDescription: "Your GP is your main entry point to the healthcare system.",
    body:
      "Once you have access, choose or change your GP via Helsenorge. If your preferred GP is full, you can join a waiting list.",
    category: "HEALTH",
    officialLinks: [
      { label: "About changing GP (Helsenorge)", url: "https://www.helsenorge.no/en/change-doctor-gp/about/" },
      { label: "GP services (Helsenorge)", url: "https://www.helsenorge.no/en/gp/" },
    ],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 10,
  },
  {
    slug: "european-health-insurance-card",
    title: "Apply for European Health Insurance Card (EHIC) (if eligible)",
    shortDescription: "Documents your right to necessary healthcare during temporary stays abroad (rules apply).",
    body:
      "If eligible, EHIC can be useful for temporary stays in EU/EEA countries, Switzerland, or the UK under applicable rules.",
    category: "HEALTH",
    officialLinks: [{ label: "EHIC (Helsenorge)", url: "https://www.helsenorge.no/en/health-rights-tourist-abroad/the-european-health-insurance-card/" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 20,
  },

  // -----------------
  // FAMILY
  // -----------------
  {
    slug: "apply-child-benefit",
    title: "Apply for child benefit (barnetrygd) if applicable",
    shortDescription: "Support for families with children living in Norway (rules apply).",
    body:
      "Child benefit is administered by NAV. Eligibility depends on the child living in Norway and other criteria.",
    category: "FAMILY",
    officialLinks: [{ label: "Child benefit (NAV)", url: "https://www.nav.no/barnetrygd/en" }],
    requiresChildren: true,
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 10,
  },

  // -----------------
  // HOUSING
  // -----------------
  {
    slug: "understand-renting-basics",
    title: "Understand renting basics (deposit, contract, rights)",
    shortDescription: "Know what a normal deposit is and what to avoid.",
    body:
      "Read up on standard rental practices: written contract, deposit account, and your rights and obligations as a tenant.",
    category: "HOUSING",
    officialLinks: [{ label: "Tenancy Act (Lovdata)", url: "https://lovdata.no/dokument/NL/lov/1999-03-26-17" }],
    minDaysFromArrival: -60,
    maxDaysFromArrival: 3650,
    sortOrder: 10,
  },

  // -----------------
  // DRIVING
  // -----------------
  {
    slug: "foreign-driving-licence-rules",
    title: "Check rules for using a foreign driving licence in Norway",
    shortDescription: "Rules differ for EU/EEA vs non-EU/EEA licences.",
    body:
      "Different rules apply depending on where your licence is issued. Check what applies to you if you plan to drive in Norway.",
    category: "DRIVING",
    officialLinks: [
      { label: "Driving licences in Norway and abroad (Vegvesen)", url: "https://www.vegvesen.no/en/driving-licences/driving-licence-holders/driving-licences-in-norway-and-abroad/" },
    ],
    minDaysFromArrival: -30,
    maxDaysFromArrival: 3650,
    sortOrder: 10,
  },
  {
    slug: "exchange-eu-eea-driving-licence",
    title: "Exchange EU/EEA driving licence (optional)",
    shortDescription: "You can exchange an EU/EEA licence for a Norwegian one.",
    body:
      "If you have an EU/EEA driving licence, you can exchange it for a Norwegian licence for the corresponding category.",
    category: "DRIVING",
    officialLinks: [
      { label: "Exchanging EU/EEA driving licences (Vegvesen)", url: "https://www.vegvesen.no/en/driving-licences/driving-licence-holders/foreign-driving-licence-in-norway/exchanging-eueea-driving-licences/" },
    ],
    requiresEU: true,
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 20,
  },
];

async function main() {
  for (const t of tasks) {
    await prisma.task.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        title: t.title,
        shortDescription: t.shortDescription,
        body: t.body,
        category: t.category,
        officialLinks: t.officialLinks as any,
        sortOrder: t.sortOrder,

        requiresEU: t.requiresEU ?? null,
        requiresEmploymentStatus: t.requiresEmploymentStatus ?? [],
        requiresChildren: t.requiresChildren ?? null,

        minDaysFromArrival: t.minDaysFromArrival ?? null,
        maxDaysFromArrival: t.maxDaysFromArrival ?? null,
      },
      update: {
        title: t.title,
        shortDescription: t.shortDescription,
        body: t.body,
        category: t.category,
        officialLinks: t.officialLinks as any,
        sortOrder: t.sortOrder,

        requiresEU: t.requiresEU ?? null,
        requiresEmploymentStatus: t.requiresEmploymentStatus ?? [],
        requiresChildren: t.requiresChildren ?? null,

        minDaysFromArrival: t.minDaysFromArrival ?? null,
        maxDaysFromArrival: t.maxDaysFromArrival ?? null,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

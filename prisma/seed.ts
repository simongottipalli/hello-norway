// prisma/seed.ts
import { PrismaClient, TaskCategory, EmploymentStatus, Prisma } from "../src/generated/prisma/client";
import { EMAIL_REGEX } from "../src/lib/validation";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";
import { fileURLToPath } from "url";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type Link = { label: string; url: string };

type SeedTask = {
  slug: string;
  title: string;
  shortDescription: string;
  body: string;
  category: TaskCategory;
  officialLinks: Link[];
  sortOrder: number;
  recurrenceType: "ONCE" | "YEARLY" | "CUSTOM";

  // Eligibility (nullable)
  requiresEU?: boolean | null;
  requiresEmploymentStatus?: EmploymentStatus[];
  requiresChildren?: boolean | null;

  // Timing window relative to arrival date
  // Negative = before arrival, 0 = arrival day, positive = after arrival
  minDaysFromArrival?: number | null;
  maxDaysFromArrival?: number | null;
};

export const tasks: SeedTask[] = [
  {
    slug: "book-sua-or-authority-appointments",
    title: "Book appointments with SUA or the right authorities early",
    shortDescription: "Reserve time with SUA, police, and/or Skatteetaten as soon as you know your move date.",
    body:
      "Use SUA if available (Oslo, Stavanger, Bergen, Trondheim, Kirkenes). If not, book directly with the police and Tax Administration. Why it matters: appointment availability can delay ID number, tax card, and work onboarding.",
    recurrenceType: "ONCE",
    category: "ARRIVAL",
    officialLinks: [
      { label: "Service Centre for Foreign Workers (SUA)", url: "https://www.sua.no/en/" },
      { label: "Book tax office appointment (Skatteetaten)", url: "https://www.skatteetaten.no/en/contact/offices/book/" },
    ],
    minDaysFromArrival: -60,
    maxDaysFromArrival: 30,
    sortOrder: 10,
  },
  {
    slug: "register-with-police-eu-eea",
    title: "Register with police (EU/EEA nationals)",
    shortDescription: "If you are an EU/EEA national staying in Norway, register once with police.",
    body:
      "Complete the EU/EEA registration process and keep your registration certificate. Why it matters: this is the documented first immigration step for many EU/EEA newcomers.",
    recurrenceType: "ONCE",
    category: "ARRIVAL",
    officialLinks: [{ label: "Registration certificate for EU/EEA nationals (UDI)", url: "https://www.udi.no/en/word-definitions/registration-certificate-for-eueea-nationals/" }],
    requiresEU: true,
    minDaysFromArrival: -14,
    maxDaysFromArrival: 90,
    sortOrder: 20,
  },
  {
    slug: "apply-residence-permit-non-eu",
    title: "Apply for a residence permit (non-EU/EEA nationals)",
    shortDescription: "Apply through UDI for your skilled worker or relevant permit before/after arrival as instructed.",
    body:
      "Follow the permit path that matches your citizenship and purpose of stay. Why it matters: legal residence and work rights depend on an approved permit.",
    recurrenceType: "CUSTOM",
    category: "ARRIVAL",
    officialLinks: [
      { label: "Residence permit information (Norway.no)", url: "https://www.norway.no/en/central-content/en/service-info/visitors-visa-res-permit/res-permit/" },
      { label: "Work in Norway - Apply for residence permit", url: "https://workinnorway.no/en/Guide%2Bfor%2Bcitizens%2Bfrom%2Bcountries%2Boutside%2BEU%2Band%2BEEA/Get%2Bstarted%2Bin%2BNorway/Apply%2Bfor%2Ba%2Bresidence%2Bpermit" },
    ],
    requiresEU: false,
    minDaysFromArrival: -120,
    maxDaysFromArrival: 120,
    sortOrder: 30,
  },
  {
    slug: "obtain-residence-card-non-eu",
    title: "Attend police appointment to obtain residence card (non-EU/EEA)",
    shortDescription: "Book and attend your police appointment so your residence card can be produced.",
    body:
      "After permit approval, attend the required police appointment for card processing. Why it matters: the residence card is practical proof of your permit status in Norway.",
    recurrenceType: "ONCE",
    category: "ARRIVAL",
    officialLinks: [
      { label: "Booking and attending appointments (Police)", url: "https://www.politiet.no/en/english/residence-permits-and-protection/booking-and-attending/" },
      { label: "Residence cards (UDI)", url: "https://www.udi.no/en/word-definitions/-residence-cards/" },
    ],
    requiresEU: false,
    minDaysFromArrival: 0,
    maxDaysFromArrival: 120,
    sortOrder: 40,
  },
  {
    slug: "register-address-folkeregisteret",
    title: "Register your address with Folkeregisteret",
    shortDescription: "If you stay more than 6 months, report your move to the National Population Register.",
    body:
      "Report your move to Norway and provide valid address documentation. Why it matters: registered address affects mail, GP rights, and other public services.",
    recurrenceType: "ONCE",
    category: "ARRIVAL",
    officialLinks: [{ label: "Move to Norway (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/national-registry/moving/to-Norway/" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 60,
    sortOrder: 50,
  },
  {
    slug: "get-id-number-and-complete-id-check",
    title: "Get a Norwegian ID number and complete ID check",
    shortDescription: "Get a national identity number or D-number depending on your stay and status.",
    body:
      "Complete your ID check at a tax office when required and ensure your identifier is issued. Why it matters: your ID number unlocks banking, tax setup, and e-ID.",
    recurrenceType: "ONCE",
    category: "ARRIVAL",
    officialLinks: [
      { label: "National identity numbers (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/national-registry/identitetsnummer-og-elektronisk-id/fodselsnummer/" },
      { label: "D number (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/national-registry/identitetsnummer-og-elektronisk-id/d-nummer/" },
      { label: "Tax offices that carry out ID checks (Skatteetaten)", url: "https://www.skatteetaten.no/en/contact/offices/id-check/" },
    ],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 90,
    sortOrder: 60,
  },
  {
    slug: "report-change-of-address",
    title: "Report change of address if you move within Norway",
    shortDescription: "Notify Folkeregisteret no later than 8 days after moving.",
    body:
      "Submit change-of-address notification online or through approved channels. Why it matters: official letters and public-service records depend on your correct address.",
    recurrenceType: "CUSTOM",
    category: "ARRIVAL",
    officialLinks: [{ label: "Moving within Norway (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/national-registry/moving/within-norway/" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 70,
  },
  {
    slug: "open-bank-account-and-get-bankid",
    title: "Open a bank account and get BankID",
    shortDescription: "After receiving an ID number, set up your bank account and request BankID.",
    body:
      "Use your Norwegian identification number to open an account and request BankID through your bank. Why it matters: BankID is needed for most digital public and private services.",
    recurrenceType: "ONCE",
    category: "IDENTITY_BANKING",
    officialLinks: [
      { label: "Identification numbers and electronic ID (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/national-registry/identitetsnummer-og-elektronisk-id/" },
      { label: "Become an online user (Skatteetaten)", url: "https://www.skatteetaten.no/en/about-the-tax-administration/online-user/become-an-online-user/" },
    ],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 180,
    sortOrder: 10,
  },
  {
    slug: "apply-tax-deduction-card",
    title: "Apply for a tax deduction card (skattekort)",
    shortDescription: "Apply before your first salary payment so tax withholding is correct.",
    body:
      "Submit your tax card request and verify your employer can retrieve it electronically. Why it matters: without a tax card, employers may withhold 50% tax.",
    recurrenceType: "YEARLY",
    category: "TAX_WORK",
    officialLinks: [
      { label: "Order a tax deduction card (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/taxes/tax-deduction-card-and-advance-tax/order-a-tax-deduction-card/" },
      { label: "Tax deduction cards for foreign employees (Skatteetaten)", url: "https://www.skatteetaten.no/en/business-and-organisation/foreign/employer/tax-deduction-cards/" },
    ],
    requiresEmploymentStatus: ["EMPLOYED", "SELF_EMPLOYED"],
    minDaysFromArrival: -14,
    maxDaysFromArrival: 60,
    sortOrder: 20,
  },
  {
    slug: "submit-tax-return",
    title: "Review and submit your tax return each year",
    shortDescription: "Check pre-filled tax data and submit corrections before the annual deadline.",
    body:
      "Log into My Tax to review deductions, income, and any reportable changes. Why it matters: errors can lead to overpayment, underpayment, or penalties.",
    recurrenceType: "YEARLY",
    category: "TAX_WORK",
    officialLinks: [{ label: "Tax return (Skatteetaten)", url: "https://www.skatteetaten.no/en/person/taxes/tax-return/" }],
    minDaysFromArrival: 60,
    maxDaysFromArrival: 3650,
    sortOrder: 30,
  },
  {
    slug: "nav-membership-basics",
    title: "Understand National Insurance (NAV) membership basics",
    shortDescription: "Check whether your rights are based on residence, employment, or both.",
    body:
      "Review membership rules for your exact immigration and work situation. Why it matters: membership determines eligibility for key NAV services and benefits.",
    recurrenceType: "CUSTOM",
    category: "TAX_WORK",
    officialLinks: [{ label: "Membership (NAV)", url: "https://www.nav.no/en/home/rules-and-regulations/membership-of-the-national-insurance-scheme" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 40,
  },
  {
    slug: "register-with-gp-fastlege",
    title: "Register with a GP (fastlege)",
    shortDescription: "Once eligible, choose your GP through Helsenorge.",
    body:
      "Residents in the National Population Register can choose or change GP and join waiting lists. Why it matters: your GP is the entry point for referrals and regular care.",
    recurrenceType: "CUSTOM",
    category: "HEALTH",
    officialLinks: [{ label: "The right to a doctor in Norway (Helsenorge)", url: "https://www.helsenorge.no/en/gp/about-gp/the-right-to-a-doctor/" }],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 10,
  },
  {
    slug: "apply-child-benefit",
    title: "Apply for child benefit (barnetrygd) if you have children",
    shortDescription: "Families with eligible children can apply for monthly child benefit from NAV.",
    body:
      "Submit your application and supporting details through NAV channels. Why it matters: this benefit helps families cover child-related living costs.",
    recurrenceType: "CUSTOM",
    category: "FAMILY",
    officialLinks: [{ label: "Child benefit (NAV)", url: "https://www.nav.no/barnetrygd/en" }],
    requiresChildren: true,
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 10,
  },
  {
    slug: "notify-nav-if-unemployed",
    title: "Notify NAV if you become unemployed",
    shortDescription: "Register your job-seeker status with NAV quickly if employment ends.",
    body:
      "Report unemployment and check your entitlement to support based on membership and work history. Why it matters: early registration can affect benefit eligibility and timelines.",
    recurrenceType: "CUSTOM",
    category: "TAX_WORK",
    officialLinks: [{ label: "Membership and rights overview (NAV)", url: "https://www.nav.no/en/home/rules-and-regulations/membership-of-the-national-insurance-scheme" }],
    requiresEmploymentStatus: ["UNEMPLOYED"],
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 50,
  },
  {
    slug: "renew-residence-permit-before-expiry",
    title: "Renew your residence permit before it expires (if applicable)",
    shortDescription: "Track permit validity and submit renewal applications in time.",
    body:
      "Use UDI guidance and apply for renewal early enough to avoid gaps in legal stay and work rights. Why it matters: late renewal can interrupt work authorization and access to services.",
    recurrenceType: "CUSTOM",
    category: "ARRIVAL",
    officialLinks: [{ label: "Want to apply / renew permit (UDI)", url: "https://www.udi.no/en/want-to-apply/" }],
    requiresEU: false,
    minDaysFromArrival: 0,
    maxDaysFromArrival: 3650,
    sortOrder: 80,
  },
];

async function seedAdminUser() {
  const raw = process.env.ADMIN_SEED_EMAIL;
  if (!raw) {
    console.warn("ADMIN_SEED_EMAIL not set — skipping admin user seed");
    return;
  }
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    console.warn("ADMIN_SEED_EMAIL is not a valid email address — skipping admin user seed");
    return;
  }
  await prisma.adminUser.upsert({
    where: { email },
    create: { email },
    update: {},
  });
  console.log("Admin user seeded successfully");
}

async function main() {
  await seedAdminUser();

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        title: t.title,
        shortDescription: t.shortDescription,
        body: t.body,
        category: t.category,
        officialLinks: t.officialLinks as Prisma.InputJsonValue,
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
        officialLinks: t.officialLinks as Prisma.InputJsonValue,
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

const currentFilePath = fileURLToPath(import.meta.url);
// argv[1] covers direct tsx execution; argv[2] covers wrappers that pass seed path as second arg.
const isDirectRun = [process.argv[1], process.argv[2]].some((arg) => arg && path.resolve(arg) === currentFilePath);

if (isDirectRun) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

/**
 * Helper script that runs via `tsx` so the Prisma-generated ESM client
 * is properly loaded (see db-setup.ts for rationale).
 *
 * Expects:
 *   env  DATABASE_URL
 *   argv[2]  test-user email to delete (cascades to sessions)
 */
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx db-teardown.ts <email>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.user.deleteMany({ where: { email } });

    // Clean up OTP records created by login E2E tests. These are not tied to
    // the test user (OTPCode has no userId FK), so they must be deleted
    // separately. Leaving them would cause rate-limit failures on the next run.
    await prisma.oTPCode.deleteMany({
      where: { email: { startsWith: "e2e-otp-" } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

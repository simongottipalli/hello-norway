/**
 * Helper script that runs via `tsx` (see db-setup.ts for rationale).
 *
 * Deletes the AdminUser (cascades to AdminSession) and any OTP codes
 * created by the admin login e2e tests.
 *
 * Expects:
 *   env  DATABASE_URL
 *   argv[2]  admin email
 */
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx admin-db-teardown.ts <email>");
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
    await prisma.adminUser.deleteMany({ where: { email } });

    // OTPCode rows for the admin login flow tests (no FK to AdminUser).
    await prisma.oTPCode.deleteMany({
      where: { email: { startsWith: "e2e-admin-" } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

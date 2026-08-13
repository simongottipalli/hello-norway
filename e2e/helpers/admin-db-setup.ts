/**
 * Helper script that runs via `tsx` (see db-setup.ts for rationale).
 *
 * Creates an AdminUser + two AdminSession rows (main + logout) and
 * prints a single JSON line to stdout:
 *   { sessionToken, logoutSessionToken, expiresAt }
 *
 * Expects:
 *   env  DATABASE_URL
 *   argv[2]  admin email
 */
import crypto from "crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx admin-db-setup.ts <email>");
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
    const adminUser = await prisma.adminUser.upsert({
      where: { email },
      update: {},
      create: { email, name: "E2E Admin" },
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Main session: used by all authenticated admin tests.
    const sessionToken = crypto.randomBytes(48).toString("hex");
    await prisma.adminSession.create({
      data: { sessionToken, adminUserId: adminUser.id, expiresAt },
    });

    // Logout session: used exclusively by the logout test.
    const logoutSessionToken = crypto.randomBytes(48).toString("hex");
    await prisma.adminSession.create({
      data: { sessionToken: logoutSessionToken, adminUserId: adminUser.id, expiresAt },
    });

    console.log(
      JSON.stringify({ sessionToken, logoutSessionToken, expiresAt: expiresAt.toISOString() }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

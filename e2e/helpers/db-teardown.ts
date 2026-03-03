/**
 * Helper script that runs via `tsx` so the Prisma-generated ESM client
 * is properly loaded (see db-setup.ts for rationale).
 *
 * Expects:
 *   env  DATABASE_URL
 *   argv[2]  test-user email to delete (cascades to sessions)
 */
import { PrismaClient } from "../../src/generated/prisma/client.js";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx db-teardown.ts <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.user.deleteMany({ where: { email } });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

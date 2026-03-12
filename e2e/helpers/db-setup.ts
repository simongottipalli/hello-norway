/**
 * Helper script that runs via `tsx` so the Prisma-generated ESM client
 * is properly loaded (Playwright's esbuild transpiles to CJS, which
 * breaks `import.meta.url` in the generated client).
 *
 * Expects:
 *   env  DATABASE_URL
 *   argv[2]  test-user email
 *
 * Prints a JSON line to stdout: { sessionToken, expiresAt, userId }
 */
import crypto from "crypto";
import { PrismaClient } from "../../src/generated/prisma/client.js";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx db-setup.ts <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: "E2E Test User" },
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Main session: used by all tests
    const sessionToken = crypto.randomBytes(48).toString("hex");
    await prisma.session.create({
      data: { sessionToken, userId: user.id, expiresAt },
    });

    // Logout session: used exclusively by the logout test so it can be
    // safely deleted without invalidating the main session used by other tests.
    const logoutSessionToken = crypto.randomBytes(48).toString("hex");
    await prisma.session.create({
      data: { sessionToken: logoutSessionToken, userId: user.id, expiresAt },
    });

    // Output JSON for the calling process to parse.
    console.log(JSON.stringify({ sessionToken, logoutSessionToken, expiresAt: expiresAt.toISOString(), userId: user.id }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

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
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx db-setup.ts <email>");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

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

    // Seed a handful of tasks and UserTask records so the dashboard always
    // shows task cards with "View" buttons for the modal tests to interact with.
    // Tasks are upserted by slug so repeated runs are idempotent.
    // Set dueDate within the next 7 days so these tasks appear as "upcoming"
    // in the default dashboard view (which only shows overdue/upcoming tasks).
    const e2eTasks = [
      { slug: "e2e-task-register-address", title: "Register your address", shortDescription: "Complete address registration", category: "ARRIVAL" as const, sortOrder: 9901 },
      { slug: "e2e-task-open-bank-account", title: "Open a bank account", shortDescription: "Set up a Norwegian bank account", category: "IDENTITY_BANKING" as const, sortOrder: 9902 },
      { slug: "e2e-task-get-health-card", title: "Get a health card", shortDescription: "Apply for the national health card", category: "HEALTH" as const, sortOrder: 9903 },
    ];

    const upcomingDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (const taskData of e2eTasks) {
      const task = await prisma.task.upsert({
        where: { slug: taskData.slug },
        update: {},
        create: {
          slug: taskData.slug,
          title: taskData.title,
          shortDescription: taskData.shortDescription,
          body: taskData.title,
          category: taskData.category,
          sortOrder: taskData.sortOrder,
          officialLinks: {},
        },
      });

      await prisma.userTask.upsert({
        where: { userId_taskId: { userId: user.id, taskId: task.id } },
        update: { dueDate: upcomingDueDate, status: "TODO" },
        create: { userId: user.id, taskId: task.id, status: "TODO", dueDate: upcomingDueDate },
      });
    }

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

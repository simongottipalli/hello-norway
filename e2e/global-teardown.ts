import { TEST_USER_EMAIL } from "./global-setup";

export default async function globalTeardown() {
  const { PrismaClient } = await import("../src/generated/prisma/index.js");
  const prisma = new PrismaClient();

  try {
    // Deleting the user cascades to their sessions automatically.
    await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
  } finally {
    await prisma.$disconnect();
  }
}

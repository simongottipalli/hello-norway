import { TEST_USER_EMAIL } from "./global-setup";
import { PrismaClient } from "../src/generated/prisma/client.js";

export default async function globalTeardown() {
  const prisma = new PrismaClient();

  try {
    // Deleting the user cascades to their sessions automatically.
    await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
  } finally {
    await prisma.$disconnect();
  }
}

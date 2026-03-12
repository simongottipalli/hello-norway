import { PrismaClient } from './src/generated/prisma/client.js';

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  console.log('User:', JSON.stringify(user, null, 2));
  const userTasks = await prisma.userTask.findMany({ where: { userId: user?.id } });
  console.log('UserTasks count:', userTasks.length);
  await prisma.$disconnect();
}

main();

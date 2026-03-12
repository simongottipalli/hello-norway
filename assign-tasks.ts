import { PrismaClient } from './src/generated/prisma/client.js';

async function main() {
  const prisma = new PrismaClient();
  
  // Find the user
  const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  if (!user) {
    console.log('User not found');
    return;
  }
  
  // Get all tasks
  const tasks = await prisma.task.findMany({ take: 10 });
  
  // Assign tasks to user with different statuses
  for (let i = 0; i < tasks.length && i < 5; i++) {
    const task = tasks[i];
    const statuses = ['TODO', 'SAVED', 'DONE'];
    const status = statuses[i % 3] as 'TODO' | 'SAVED' | 'DONE';
    
    // Create some with due dates
    const dueDate = i < 2 ? new Date(Date.now() + (i - 1) * 24 * 60 * 60 * 1000) : null; // First one overdue, second upcoming
    
    await prisma.userTask.upsert({
      where: {
        userId_taskId: {
          userId: user.id,
          taskId: task.id,
        },
      },
      create: {
        userId: user.id,
        taskId: task.id,
        status,
        dueDate,
        personalNotes: i === 0 ? 'Test note for first task' : null,
      },
      update: {
        status,
        dueDate,
      },
    });
  }
  
  console.log(`Assigned ${Math.min(5, tasks.length)} tasks to user`);
  await prisma.$disconnect();
}

main().catch(console.error);

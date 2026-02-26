-- CreateEnum
CREATE TYPE "UserTaskStatus" AS ENUM ('TODO', 'SAVED', 'DONE');

-- CreateTable
CREATE TABLE "UserTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "status" "UserTaskStatus" NOT NULL,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTask_userId_idx" ON "UserTask"("userId");

-- CreateIndex
CREATE INDEX "UserTask_taskId_idx" ON "UserTask"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTask_userId_taskId_key" ON "UserTask"("userId", "taskId");

-- AddForeignKey
ALTER TABLE "UserTask" ADD CONSTRAINT "UserTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTask" ADD CONSTRAINT "UserTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

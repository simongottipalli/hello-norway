-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('ARRIVAL', 'IDENTITY_BANKING', 'HEALTH', 'TAX_WORK', 'FAMILY', 'HOUSING', 'DRIVING', 'OTHER');

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "shortDescription" VARCHAR(280) NOT NULL,
    "body" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "officialLinks" JSONB NOT NULL,
    "requiresEU" BOOLEAN,
    "requiresEmploymentStatus" "EmploymentStatus"[],
    "requiresChildren" BOOLEAN,
    "minYearsInNorway" SMALLINT,
    "maxYearsInNorway" SMALLINT,
    "sortOrder" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_slug_key" ON "Task"("slug");

-- CreateIndex
CREATE INDEX "Task_category_sortOrder_idx" ON "Task"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "Task_slug_idx" ON "Task"("slug");

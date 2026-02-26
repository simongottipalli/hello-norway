/*
  Warnings:

  - You are about to drop the column `maxYearsInNorway` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `minYearsInNorway` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "maxYearsInNorway",
DROP COLUMN "minYearsInNorway",
ADD COLUMN     "maxDaysFromArrival" SMALLINT,
ADD COLUMN     "minDaysFromArrival" SMALLINT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plannedArrivalDate" DATE,
ALTER COLUMN "employmentStatus" DROP NOT NULL,
ALTER COLUMN "hasChildren" DROP NOT NULL,
ALTER COLUMN "housingType" DROP NOT NULL,
ALTER COLUMN "isEU" DROP NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

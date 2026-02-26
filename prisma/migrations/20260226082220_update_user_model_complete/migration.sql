/*
  Warnings:

  - You are about to drop the column `yearsInNorway` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "yearsInNorway",
ADD COLUMN     "arrivalDate" DATE,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(320)`.
  - Added the required column `employmentStatus` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hasChildren` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `housingType` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isEU` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearsInNorway` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('RENT', 'OWN', 'LIVES_WITH_FAMILY', 'OTHER');

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "employmentStatus" "EmploymentStatus" NOT NULL,
ADD COLUMN     "hasChildren" BOOLEAN NOT NULL,
ADD COLUMN     "housingType" "HousingType" NOT NULL,
ADD COLUMN     "isEU" BOOLEAN NOT NULL,
ADD COLUMN     "yearsInNorway" SMALLINT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(320),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

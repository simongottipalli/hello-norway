-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "OTPCode" ADD COLUMN "purpose" "OtpPurpose" NOT NULL DEFAULT 'USER';

-- DropIndex
DROP INDEX "OTPCode_email_createdAt_idx";

-- CreateIndex
CREATE INDEX "OTPCode_email_purpose_createdAt_idx" ON "OTPCode"("email", "purpose", "createdAt");

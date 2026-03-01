-- DropIndex
DROP INDEX "OTPCode_email_idx";

-- CreateIndex
CREATE INDEX "OTPCode_email_createdAt_idx" ON "OTPCode"("email", "createdAt");

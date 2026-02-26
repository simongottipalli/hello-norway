-- First, update any existing NULL values to empty string (if any exist)
-- This prevents the NOT NULL constraint from failing
UPDATE "User" SET "name" = '' WHERE "name" IS NULL;

-- AlterTable: Make name field NOT NULL
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

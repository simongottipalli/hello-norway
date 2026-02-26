-- First, update any existing NULL values to a placeholder value (if any exist)
-- This prevents the NOT NULL constraint from failing on existing data
-- In a production scenario, you may want to handle this differently or reject NULL values
UPDATE "User" SET "name" = 'Unknown User' WHERE "name" IS NULL;

-- AlterTable: Make name field NOT NULL
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

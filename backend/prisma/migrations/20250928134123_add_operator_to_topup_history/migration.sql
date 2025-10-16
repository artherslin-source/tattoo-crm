/*
  Warnings:

  - Added the required column `operatorId` to the `TopupHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable - Add operatorId column to TopupHistory
ALTER TABLE "TopupHistory" ADD COLUMN "operatorId" TEXT;

-- Update existing rows with a default operatorId (using 'system' as fallback)
UPDATE "TopupHistory" SET "operatorId" = 'system' WHERE "operatorId" IS NULL;

-- Make operatorId NOT NULL
ALTER TABLE "TopupHistory" ALTER COLUMN "operatorId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "TopupHistory" ADD CONSTRAINT "TopupHistory_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

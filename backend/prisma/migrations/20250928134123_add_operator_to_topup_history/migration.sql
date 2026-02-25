/*
  Warnings:

  - Added the required column `operatorId` to the `TopupHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable - Add operatorId column (idempotent for re-run after resolve --rolled-back)
ALTER TABLE "TopupHistory" ADD COLUMN IF NOT EXISTS "operatorId" TEXT;

-- Update existing rows: use first existing User id (required for FK; seed/DB should have at least one User)
UPDATE "TopupHistory" SET "operatorId" = (SELECT id FROM "User" LIMIT 1) WHERE "operatorId" IS NULL;

-- Make operatorId NOT NULL only when no NULLs remain (safe when User table is empty or TopupHistory empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "TopupHistory" WHERE "operatorId" IS NULL) THEN
    ALTER TABLE "TopupHistory" ALTER COLUMN "operatorId" SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint (idempotent: skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TopupHistory_operatorId_fkey'
  ) THEN
    ALTER TABLE "TopupHistory"
      ADD CONSTRAINT "TopupHistory_operatorId_fkey"
      FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

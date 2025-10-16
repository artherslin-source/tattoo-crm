-- AlterTable - Add type column to TopupHistory with default value
ALTER TABLE "TopupHistory" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'TOPUP';

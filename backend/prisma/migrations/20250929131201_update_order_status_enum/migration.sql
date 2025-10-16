-- AlterTable - Update Order.status default value
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Update existing 'UNPAID' status to 'PENDING' if needed
UPDATE "Order" SET "status" = 'PENDING' WHERE "status" = 'UNPAID';

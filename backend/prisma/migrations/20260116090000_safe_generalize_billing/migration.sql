-- Safe billing generalization (NON-DESTRUCTIVE)
-- Purpose:
-- - Ensure current app code can run even if the historical migration
--   `20251231010000_remove_orders_and_generalize_billing` was skipped/failed in production.
-- - Add/relax columns used by Billing v3+ codepaths WITHOUT dropping any existing customer data.
--
-- Notes:
-- - This migration is intentionally idempotent (IF NOT EXISTS / guarded DO blocks).
-- - We do NOT drop Order/Installment tables, enums, or Appointment.orderId here.

-- 1) Make AppointmentBill.appointmentId nullable (supports non-appointment bills)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'AppointmentBill' AND column_name = 'appointmentId'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = 'AppointmentBill'
        AND a.attname = 'appointmentId'
        AND a.attnotnull = true
    ) THEN
      ALTER TABLE "AppointmentBill" ALTER COLUMN "appointmentId" DROP NOT NULL;
    END IF;
  END IF;
END $$;

-- 2) Make AppointmentBill.customerId nullable (supports walk-in bills / snapshots)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'AppointmentBill' AND column_name = 'customerId'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = 'AppointmentBill'
        AND a.attname = 'customerId'
        AND a.attnotnull = true
    ) THEN
      ALTER TABLE "AppointmentBill" ALTER COLUMN "customerId" DROP NOT NULL;
    END IF;
  END IF;
END $$;

-- 3) Add generalized fields (used by backend billing service/controllers)
ALTER TABLE "AppointmentBill"
  ADD COLUMN IF NOT EXISTS "billType" TEXT NOT NULL DEFAULT 'APPOINTMENT',
  ADD COLUMN IF NOT EXISTS "customerNameSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "customerPhoneSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- 4) Optional FK to User for createdById
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AppointmentBill_createdById_fkey'
  ) THEN
    ALTER TABLE "AppointmentBill"
      ADD CONSTRAINT "AppointmentBill_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 5) Helpful index for filtering bill types by date
CREATE INDEX IF NOT EXISTS "AppointmentBill_billType_createdAt_idx"
  ON "AppointmentBill"("billType", "createdAt");


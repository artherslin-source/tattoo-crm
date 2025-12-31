-- Remove Order/Installment system (Billing is the single source of truth)

-- 1) Drop Appointment.orderId (and any dependent constraints/indexes)
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "orderId";

-- 2) Drop Installment/Order tables (order of operations matters)
DROP TABLE IF EXISTS "Installment";
DROP TABLE IF EXISTS "Order";

-- 3) Drop enums used only by Order/Installment (if they exist)
DROP TYPE IF EXISTS "InstallmentStatus";
DROP TYPE IF EXISTS "OrderStatus";
DROP TYPE IF EXISTS "PaymentType";

-- 4) Generalize AppointmentBill to support non-appointment bills
ALTER TABLE "AppointmentBill"
  ALTER COLUMN "appointmentId" DROP NOT NULL,
  ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "AppointmentBill"
  ADD COLUMN IF NOT EXISTS "billType" TEXT NOT NULL DEFAULT 'APPOINTMENT',
  ADD COLUMN IF NOT EXISTS "customerNameSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "customerPhoneSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- FK to user for createdBy (optional)
ALTER TABLE "AppointmentBill"
  ADD CONSTRAINT IF NOT EXISTS "AppointmentBill_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Helpful index for filtering bill types by date
CREATE INDEX IF NOT EXISTS "AppointmentBill_billType_createdAt_idx"
  ON "AppointmentBill"("billType","createdAt");



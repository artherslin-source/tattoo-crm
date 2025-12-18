-- Appointment holdMin support (schedule hold time)

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "holdMin" INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS "holdUpdatedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "holdUpdatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "holdUpdateReason" TEXT;



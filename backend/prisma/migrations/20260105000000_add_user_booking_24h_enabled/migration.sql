-- Add artist 24h booking toggle (default false)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "booking24hEnabled" BOOLEAN NOT NULL DEFAULT false;



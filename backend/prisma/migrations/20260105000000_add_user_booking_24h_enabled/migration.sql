-- Add artist 24h booking toggle (default false)
ALTER TABLE "User" ADD COLUMN "booking24hEnabled" BOOLEAN NOT NULL DEFAULT false;



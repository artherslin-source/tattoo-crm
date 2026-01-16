-- Add SiteConfig table for editable site-wide configuration (e.g. homepage hero)

CREATE TABLE IF NOT EXISTS "SiteConfig" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteConfig_key_key" ON "SiteConfig"("key");

CREATE INDEX IF NOT EXISTS "SiteConfig_updatedById_updatedAt_idx" ON "SiteConfig"("updatedById", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SiteConfig_updatedById_fkey'
  ) THEN
    ALTER TABLE "SiteConfig"
      ADD CONSTRAINT "SiteConfig_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;



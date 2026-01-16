-- Add Contact.ownerArtistId to support assigning leads to an artist (ARTIST sees only own contacts)

ALTER TABLE "Contact"
ADD COLUMN IF NOT EXISTS "ownerArtistId" TEXT;

CREATE INDEX IF NOT EXISTS "Contact_ownerArtistId_idx" ON "Contact"("ownerArtistId");

-- Postgres does NOT support `ADD CONSTRAINT IF NOT EXISTS`, so we guard it via pg_constraint check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Contact_ownerArtistId_fkey'
  ) THEN
    ALTER TABLE "Contact"
      ADD CONSTRAINT "Contact_ownerArtistId_fkey"
      FOREIGN KEY ("ownerArtistId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;



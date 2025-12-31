-- Add Contact.ownerArtistId to support assigning leads to an artist (ARTIST sees only own contacts)

ALTER TABLE "Contact"
ADD COLUMN IF NOT EXISTS "ownerArtistId" TEXT;

CREATE INDEX IF NOT EXISTS "Contact_ownerArtistId_idx" ON "Contact"("ownerArtistId");

ALTER TABLE "Contact"
ADD CONSTRAINT IF NOT EXISTS "Contact_ownerArtistId_fkey"
FOREIGN KEY ("ownerArtistId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;



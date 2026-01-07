-- Add createdById on ArtistSplitRule for audit + add index optimized for (artistId, effectiveFrom) lookups.

ALTER TABLE "ArtistSplitRule"
ADD COLUMN IF NOT EXISTS "createdById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ArtistSplitRule_createdById_fkey'
  ) THEN
    ALTER TABLE "ArtistSplitRule"
    ADD CONSTRAINT "ArtistSplitRule_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ArtistSplitRule_artistId_effectiveFrom_idx"
ON "ArtistSplitRule"("artistId", "effectiveFrom");



-- CreateTable
CREATE TABLE IF NOT EXISTS "ArtistBranchAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistBranchAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArtistBranchAccess_userId_branchId_key" ON "ArtistBranchAccess"("userId", "branchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArtistBranchAccess_userId_idx" ON "ArtistBranchAccess"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArtistBranchAccess_branchId_idx" ON "ArtistBranchAccess"("branchId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ArtistBranchAccess_userId_fkey'
  ) THEN
    ALTER TABLE "ArtistBranchAccess"
      ADD CONSTRAINT "ArtistBranchAccess_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ArtistBranchAccess_branchId_fkey'
  ) THEN
    ALTER TABLE "ArtistBranchAccess"
      ADD CONSTRAINT "ArtistBranchAccess_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;



-- Add primary artist ownership to User (customer -> primary artist)
ALTER TABLE "User" ADD COLUMN "primaryArtistId" TEXT;

ALTER TABLE "User"
ADD CONSTRAINT "User_primaryArtistId_fkey"
FOREIGN KEY ("primaryArtistId") REFERENCES "User" ("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_primaryArtistId_branchId_idx" ON "User"("primaryArtistId", "branchId");



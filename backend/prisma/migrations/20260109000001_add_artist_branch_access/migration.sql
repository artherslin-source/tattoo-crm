-- CreateTable
CREATE TABLE "ArtistBranchAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistBranchAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistBranchAccess_userId_branchId_key" ON "ArtistBranchAccess"("userId", "branchId");

-- CreateIndex
CREATE INDEX "ArtistBranchAccess_userId_idx" ON "ArtistBranchAccess"("userId");

-- CreateIndex
CREATE INDEX "ArtistBranchAccess_branchId_idx" ON "ArtistBranchAccess"("branchId");

-- AddForeignKey
ALTER TABLE "ArtistBranchAccess" ADD CONSTRAINT "ArtistBranchAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistBranchAccess" ADD CONSTRAINT "ArtistBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- CreateTable
CREATE TABLE "ArtistLoginLink" (
    "id" TEXT NOT NULL,
    "loginUserId" TEXT NOT NULL,
    "artistUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistLoginLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistLoginLink_loginUserId_artistUserId_key" ON "ArtistLoginLink"("loginUserId", "artistUserId");

-- CreateIndex
CREATE INDEX "ArtistLoginLink_loginUserId_idx" ON "ArtistLoginLink"("loginUserId");

-- CreateIndex
CREATE INDEX "ArtistLoginLink_artistUserId_idx" ON "ArtistLoginLink"("artistUserId");

-- AddForeignKey
ALTER TABLE "ArtistLoginLink" ADD CONSTRAINT "ArtistLoginLink_loginUserId_fkey" FOREIGN KEY ("loginUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistLoginLink" ADD CONSTRAINT "ArtistLoginLink_artistUserId_fkey" FOREIGN KEY ("artistUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


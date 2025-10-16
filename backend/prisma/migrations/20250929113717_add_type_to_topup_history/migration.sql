-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TopupHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TOPUP',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopupHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TopupHistory_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TopupHistory" ("amount", "createdAt", "id", "memberId", "operatorId") SELECT "amount", "createdAt", "id", "memberId", "operatorId" FROM "TopupHistory";
DROP TABLE "TopupHistory";
ALTER TABLE "new_TopupHistory" RENAME TO "TopupHistory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

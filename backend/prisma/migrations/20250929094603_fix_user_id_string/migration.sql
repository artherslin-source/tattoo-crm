-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "birthday" TIMESTAMP,
    "gender" TEXT,
    "stylePreferences" TEXT,
    "role" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "lastLogin" TIMESTAMP,
    "status" TEXT,
    CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("birthday", "branchId", "createdAt", "email", "gender", "hashedPassword", "id", "isActive", "lastLogin", "name", "phone", "role", "status", "stylePreferences", "updatedAt") SELECT "birthday", "branchId", "createdAt", "email", "gender", "hashedPassword", "id", "isActive", "lastLogin", "name", "phone", "role", "status", "stylePreferences", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

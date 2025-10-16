-- AlterTable - Make User.name nullable
ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;

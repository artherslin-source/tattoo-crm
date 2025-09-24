-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

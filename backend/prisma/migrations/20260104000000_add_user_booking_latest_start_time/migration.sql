-- Add artist-configurable latest booking start time (HH:mm). null => default 21:00.
ALTER TABLE "User" ADD COLUMN "bookingLatestStartTime" TEXT;



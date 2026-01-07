-- SplitAllocationRecomputeJob: audit log for allocation recompute runs

CREATE TABLE IF NOT EXISTS "SplitAllocationRecomputeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fromPaidAt" TIMESTAMP NOT NULL,
    "paymentIds" JSONB,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "total" INTEGER NOT NULL DEFAULT 0,
    "recomputed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SplitAllocationRecomputeJob_actorId_fkey'
  ) THEN
    ALTER TABLE "SplitAllocationRecomputeJob"
    ADD CONSTRAINT "SplitAllocationRecomputeJob_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SplitAllocationRecomputeJob_createdAt_idx"
ON "SplitAllocationRecomputeJob"("createdAt");

CREATE INDEX IF NOT EXISTS "SplitAllocationRecomputeJob_actorId_createdAt_idx"
ON "SplitAllocationRecomputeJob"("actorId", "createdAt");



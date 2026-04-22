-- Income history fields on IncomeSource.
ALTER TABLE "IncomeSource"
ADD COLUMN "effectiveFrom" TIMESTAMP(3),
ADD COLUMN "effectiveTo" TIMESTAMP(3),
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing rows so history starts from original creation.
UPDATE "IncomeSource"
SET "effectiveFrom" = "createdAt"
WHERE "effectiveFrom" IS NULL;

ALTER TABLE "IncomeSource"
ALTER COLUMN "effectiveFrom" SET NOT NULL,
ALTER COLUMN "effectiveFrom" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "IncomeSource_userId_effectiveFrom_idx"
ON "IncomeSource"("userId", "effectiveFrom");

CREATE INDEX IF NOT EXISTS "IncomeSource_userId_effectiveTo_idx"
ON "IncomeSource"("userId", "effectiveTo");

-- Track snapshot rows needing recalculation after backdated income updates.
ALTER TABLE "MonthlySnapshot"
ADD COLUMN "needsRecalculation" BOOLEAN NOT NULL DEFAULT false;

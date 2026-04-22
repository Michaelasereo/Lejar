ALTER TABLE "Bucket"
ADD COLUMN "percentage" DOUBLE PRECISION;

CREATE TABLE "MonthlyIncomeOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "monthKey" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonthlyIncomeOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlyIncomeOverride_userId_monthKey_key"
ON "MonthlyIncomeOverride"("userId", "monthKey");

CREATE INDEX "MonthlyIncomeOverride_userId_idx"
ON "MonthlyIncomeOverride"("userId");

WITH income AS (
  SELECT
    "userId",
    SUM("amountMonthly")::double precision AS total_income
  FROM "IncomeSource"
  WHERE "isActive" = TRUE
    AND "effectiveTo" IS NULL
  GROUP BY "userId"
),
bucket_alloc AS (
  SELECT
    b.id AS bucket_id,
    COALESCE(SUM(ba."percentage"), 0) AS allocation_percentage
  FROM "Bucket" b
  LEFT JOIN "BucketAllocation" ba ON ba."bucketId" = b.id
  GROUP BY b.id
)
UPDATE "Bucket" b
SET "percentage" = CASE
  WHEN ba.allocation_percentage > 0 THEN ROUND((ba.allocation_percentage::numeric)::numeric, 4)::double precision
  WHEN COALESCE(i.total_income, 0) > 0 THEN ROUND((((b."allocatedAmount")::double precision / i.total_income) * 100)::numeric, 4)::double precision
  ELSE 0
END
FROM bucket_alloc ba
LEFT JOIN income i ON i."userId" = b."userId"
WHERE b.id = ba.bucket_id;

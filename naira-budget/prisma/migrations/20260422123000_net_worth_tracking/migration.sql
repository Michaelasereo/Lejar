ALTER TABLE "MonthlySnapshot"
ADD COLUMN "cumulativeSavings" NUMERIC(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "jarsTotal" NUMERIC(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "confirmedReturns" NUMERIC(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "totalLiabilities" NUMERIC(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "netWorth" NUMERIC(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "unspentCarryover" NUMERIC(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "monthlyNetChange" NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE TABLE "UserLiability" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "totalAmount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "breakdown" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserLiability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLiability_userId_key" ON "UserLiability"("userId");
CREATE INDEX "UserLiability_userId_idx" ON "UserLiability"("userId");

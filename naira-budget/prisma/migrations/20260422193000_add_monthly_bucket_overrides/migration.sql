-- CreateTable
CREATE TABLE "MonthlyBucketOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(14,2) NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyBucketOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBucketOverride_userId_monthKey_bucketId_key" ON "MonthlyBucketOverride"("userId", "monthKey", "bucketId");

-- CreateIndex
CREATE INDEX "MonthlyBucketOverride_userId_monthKey_idx" ON "MonthlyBucketOverride"("userId", "monthKey");

-- CreateIndex
CREATE INDEX "MonthlyBucketOverride_bucketId_idx" ON "MonthlyBucketOverride"("bucketId");

-- AddForeignKey
ALTER TABLE "MonthlyBucketOverride" ADD CONSTRAINT "MonthlyBucketOverride_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

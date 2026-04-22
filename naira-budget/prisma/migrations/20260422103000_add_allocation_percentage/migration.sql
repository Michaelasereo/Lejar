-- Add percentage source-of-truth field for bucket allocations.
ALTER TABLE "BucketAllocation"
ADD COLUMN "percentage" DOUBLE PRECISION;

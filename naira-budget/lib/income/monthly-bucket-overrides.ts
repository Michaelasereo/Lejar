import { Prisma, type PrismaClient } from "@prisma/client";
import { formatMonthParam } from "@/lib/utils/dates";

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface BucketBudgetLike {
  id: string;
  percentage: number;
  allocatedAmount: number;
}

export async function getMonthlyBucketOverrides(
  db: DbClient,
  userId: string,
  monthKey: string,
) {
  return db.monthlyBucketOverride.findMany({
    where: { userId, monthKey },
    select: {
      bucketId: true,
      allocatedAmount: true,
      percentage: true,
    },
  });
}

export async function applyMonthlyBucketOverridesToBudgets<T extends BucketBudgetLike>(
  db: DbClient,
  userId: string,
  year: number,
  month: number,
  buckets: T[],
): Promise<T[]> {
  const monthKey = formatMonthParam(year, month);
  const overrides = await getMonthlyBucketOverrides(db, userId, monthKey);
  if (overrides.length === 0) return buckets;

  const byBucket = new Map(
    overrides.map((row) => [
      row.bucketId,
      {
        percentage: row.percentage,
        allocatedAmount: Number(row.allocatedAmount),
      },
    ]),
  );

  return buckets.map((bucket) => {
    const override = byBucket.get(bucket.id);
    if (!override) return bucket;
    return {
      ...bucket,
      percentage: override.percentage,
      allocatedAmount: override.allocatedAmount,
    };
  });
}

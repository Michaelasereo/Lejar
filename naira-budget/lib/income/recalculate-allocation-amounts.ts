import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPercentageClose, normalizePercentage } from "@/lib/income/bucket-percentage";
import { percentageToAmount } from "@/lib/utils/currency";
import { getCurrentIncome } from "@/lib/utils/income";

function toDecimal(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

export async function getTotalIncomeForUser(userId: string): Promise<number> {
  const rows = await getCurrentIncome(userId);
  return rows.reduce((sum, row) => sum + Number(row.amountMonthly), 0);
}

export async function recalculateAllocationAmountsForUser(
  userId: string,
): Promise<{ totalIncome: number; updatedCount: number }> {
  const totalIncome = await getTotalIncomeForUser(userId);
  const buckets = await prisma.bucket.findMany({
    where: { userId },
    select: {
      id: true,
      percentage: true,
      allocations: {
        select: { id: true, percentage: true },
      },
    },
  });

  const valid = buckets.flatMap((bucket) =>
    bucket.allocations.filter(
      (row): row is { id: string; percentage: number } =>
        typeof row.percentage === "number" && Number.isFinite(row.percentage),
    ),
  );

  if (valid.length > 0) {
    await prisma.$transaction(
      valid.map((row) =>
        prisma.bucketAllocation.update({
          where: { id: row.id },
          data: { amount: toDecimal(percentageToAmount(row.percentage, totalIncome)) },
        }),
      ),
    );
  }

  const bucketUpdates = buckets.map((bucket) => {
    const allocationPercentage = normalizePercentage(
      bucket.allocations.reduce((sum, row) => sum + (row.percentage ?? 0), 0),
    );
    const bucketPercentage =
      typeof bucket.percentage === "number" && Number.isFinite(bucket.percentage)
        ? bucket.percentage
        : allocationPercentage;

    if (
      bucket.allocations.length > 0 &&
      !isPercentageClose(bucketPercentage, allocationPercentage)
    ) {
      throw new Error(
        `Bucket percentage mismatch for ${bucket.id}. Bucket=${bucketPercentage.toFixed(
          2,
        )}% allocations=${allocationPercentage.toFixed(2)}%`,
      );
    }

    return prisma.bucket.update({
      where: { id: bucket.id },
      data: {
        percentage: bucketPercentage,
        allocatedAmount: toDecimal(percentageToAmount(bucketPercentage, totalIncome)),
      },
    });
  });

  if (bucketUpdates.length > 0) {
    await prisma.$transaction(bucketUpdates);
  } else {
    await prisma.bucket.updateMany({
      where: { userId },
      data: { allocatedAmount: toDecimal(0) },
    });
  }

  return { totalIncome, updatedCount: valid.length };
}

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/income/money";
import { applyMonthlyBucketOverridesToBudgets } from "@/lib/income/monthly-bucket-overrides";
import { amountToPercentage } from "@/lib/utils/currency";
import { getIncomeActiveForMonth } from "@/lib/utils/income";
import { parseMonthParam } from "@/lib/utils/dates";

export interface IncomePageData {
  monthKey: string;
  incomeSources: Array<{
    id: string;
    label: string;
    amountMonthly: number;
  }>;
  buckets: Array<{
    id: string;
    name: string;
    color: string;
    sortOrder: number;
    allocatedAmount: number;
    percentage: number;
    allocationPercentage: number;
    hasAllocationMismatch: boolean;
    allocations: Array<{
      id: string;
      label: string;
      amount: number;
      percentage: number;
      platform: string;
      allocationType: string;
    }>;
  }>;
  totalIncome: number;
  totalBucketAllocated: number;
  totalAllocatedPercentage: number;
  remaining: number;
}

export async function getIncomePageData(userId: string, monthKey?: string): Promise<IncomePageData> {
  const parsedMonth = parseMonthParam(monthKey);
  const incomeSources = await getIncomeActiveForMonth(
    userId,
    parsedMonth.year,
    parsedMonth.month,
  );
  const totalIncome = incomeSources.reduce((s, r) => s + toNumber(r.amountMonthly), 0);

  const allocationsNeedingMigration = await prisma.bucketAllocation.findMany({
    where: {
      bucket: { userId },
      percentage: null,
    },
    select: { id: true, amount: true },
  });
  if (allocationsNeedingMigration.length > 0 && totalIncome > 0) {
    await prisma.$transaction(
      allocationsNeedingMigration.map((a) =>
        prisma.bucketAllocation.update({
          where: { id: a.id },
          data: { percentage: amountToPercentage(toNumber(a.amount), totalIncome) },
        }),
      ),
    );
  }

  const buckets = await prisma.bucket.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    include: {
      allocations: { orderBy: { createdAt: "asc" } },
    },
  });

  const sources = incomeSources.map((r) => ({
    id: r.id,
    label: r.label,
    amountMonthly: toNumber(r.amountMonthly),
  }));

  const bucketRows = buckets.map((b) => ({
    allocationPercentage: b.allocations.reduce((sum, a) => sum + (a.percentage ?? 0), 0),
    percentage:
      typeof b.percentage === "number"
        ? b.percentage
        : b.allocations.length > 0
          ? b.allocations.reduce((sum, a) => sum + (a.percentage ?? 0), 0)
          : amountToPercentage(toNumber(b.allocatedAmount), totalIncome),
    id: b.id,
    name: b.name,
    color: b.color,
    sortOrder: b.sortOrder,
    allocatedAmount: toNumber(b.allocatedAmount),
    hasAllocationMismatch: false,
    allocations: b.allocations.map((a) => ({
      id: a.id,
      label: a.label,
      amount: toNumber(a.amount),
      percentage:
        typeof a.percentage === "number"
          ? a.percentage
          : amountToPercentage(toNumber(a.amount), totalIncome),
      platform: a.platform,
      allocationType: a.allocationType,
    })),
  }));

  const bucketRowsWithOverrides = await applyMonthlyBucketOverridesToBudgets(
    prisma,
    userId,
    parsedMonth.year,
    parsedMonth.month,
    bucketRows,
  );

  for (const bucket of bucketRowsWithOverrides) {
    bucket.hasAllocationMismatch =
      bucket.allocations.length > 0 &&
      Math.abs(bucket.percentage - bucket.allocationPercentage) > 0.01;
  }

  const totalAllocatedPercentage = bucketRowsWithOverrides.reduce(
    (sum, bucket) => sum + bucket.percentage,
    0,
  );
  const totalBucketAllocated = bucketRowsWithOverrides.reduce((s, b) => s + b.allocatedAmount, 0);
  const remaining = totalIncome - totalBucketAllocated;

  return {
    monthKey: `${parsedMonth.year}-${String(parsedMonth.month).padStart(2, "0")}`,
    incomeSources: sources,
    buckets: bucketRowsWithOverrides,
    totalIncome,
    totalBucketAllocated,
    totalAllocatedPercentage,
    remaining,
  };
}

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/income/money";

export interface IncomePageData {
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
    allocations: Array<{
      id: string;
      label: string;
      amount: number;
      platform: string;
      allocationType: string;
    }>;
  }>;
  totalIncome: number;
  totalBucketAllocated: number;
  remaining: number;
}

export async function getIncomePageData(userId: string): Promise<IncomePageData> {
  const [incomeSources, buckets] = await Promise.all([
    prisma.incomeSource.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bucket.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
      include: {
        allocations: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  const sources = incomeSources.map((r) => ({
    id: r.id,
    label: r.label,
    amountMonthly: toNumber(r.amountMonthly),
  }));

  const bucketRows = buckets.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    sortOrder: b.sortOrder,
    allocatedAmount: toNumber(b.allocatedAmount),
    allocations: b.allocations.map((a) => ({
      id: a.id,
      label: a.label,
      amount: toNumber(a.amount),
      platform: a.platform,
      allocationType: a.allocationType,
    })),
  }));

  const totalIncome = sources.reduce((s, r) => s + r.amountMonthly, 0);
  const totalBucketAllocated = bucketRows.reduce((s, b) => s + b.allocatedAmount, 0);
  const remaining = totalIncome - totalBucketAllocated;

  return {
    incomeSources: sources,
    buckets: bucketRows,
    totalIncome,
    totalBucketAllocated,
    remaining,
  };
}

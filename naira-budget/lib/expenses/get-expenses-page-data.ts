import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dashboard/get-dashboard-data";
import { toNumber } from "@/lib/income/money";
import { applyMonthlyBucketOverridesToBudgets } from "@/lib/income/monthly-bucket-overrides";
import { getIncomeForMonth } from "@/lib/utils/income";

export interface ExpenseRecord {
  id: string;
  amount: number;
  category: string;
  label: string | null;
  occurredAt: Date;
  bucketId: string | null;
  bucketName: string | null;
  bucketColor: string | null;
}

export interface ExpensesPageData {
  monthKey: string;
  expenses: ExpenseRecord[];
  buckets: Array<{
    id: string;
    name: string;
    color: string;
    allocatedAmount: number;
    spent: number;
    remaining: number;
  }>;
  totalSpent: number;
  byCategory: Record<string, number>;
}

export async function getExpensesPageData(
  userId: string,
  monthKey: string,
): Promise<ExpensesPageData | null> {
  const range = monthRange(monthKey);
  if (!range) return null;

  const [expenseRows, bucketRows, monthIncome] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        occurredAt: { gte: range.start, lte: range.end },
      },
      include: { bucket: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.bucket.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        percentage: true,
        allocatedAmount: true,
      },
    }),
    getIncomeForMonth(userId, range.start.getFullYear(), range.start.getMonth() + 1),
  ]);

  const expenses: ExpenseRecord[] = expenseRows.map((e) => ({
    id: e.id,
    amount: toNumber(e.amount),
    category: e.category,
    label: e.label,
    occurredAt: e.occurredAt,
    bucketId: e.bucketId,
    bucketName: e.bucket?.name ?? null,
    bucketColor: e.bucket?.color ?? null,
  }));

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const c = e.category;
    byCategory[c] = (byCategory[c] ?? 0) + e.amount;
  }

  const bucketBase = bucketRows.map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    color: bucket.color,
    allocatedAmount:
      typeof bucket.percentage === "number" && bucket.percentage > 0
        ? Math.round((bucket.percentage / 100) * monthIncome)
        : toNumber(bucket.allocatedAmount),
    percentage: bucket.percentage ?? 0,
  }));
  const monthScopedBuckets = await applyMonthlyBucketOverridesToBudgets(
    prisma,
    userId,
    range.start.getFullYear(),
    range.start.getMonth() + 1,
    bucketBase,
  );
  const spentByBucket = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.bucketId) continue;
    spentByBucket.set(
      expense.bucketId,
      (spentByBucket.get(expense.bucketId) ?? 0) + expense.amount,
    );
  }
  const buckets = monthScopedBuckets.map((bucket) => {
    const spent = Math.round(spentByBucket.get(bucket.id) ?? 0);
    return {
      id: bucket.id,
      name: bucket.name,
      color: bucket.color,
      allocatedAmount: Math.round(bucket.allocatedAmount),
      spent,
      remaining: Math.round(bucket.allocatedAmount) - spent,
    };
  });

  return {
    monthKey,
    expenses,
    buckets,
    totalSpent,
    byCategory,
  };
}

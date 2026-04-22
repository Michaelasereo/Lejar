import { prisma } from "@/lib/prisma";
import { applyMonthlyBucketOverridesToBudgets } from "@/lib/income/monthly-bucket-overrides";
import { monthKeyFromDate, monthRange } from "@/lib/dashboard/get-dashboard-data";
import { getIncomeForMonth } from "@/lib/utils/income";
import { toNumber } from "@/lib/income/money";

export interface GroceryItemRecord {
  id: string;
  label: string;
  quantity: string | null;
  estimatedPrice: number | null;
  isPurchased: boolean;
  movedToExpenses: boolean;
  movedToExpensesAt: Date | null;
  sortOrder: number;
}

export interface GroceryPageData {
  monthKey: string;
  items: GroceryItemRecord[];
  bucketsForLogging: Array<{
    id: string;
    name: string;
    color: string;
    remaining: number;
  }>;
  pricedTotal: number;
  pricedCount: number;
  deferredCount: number;
  checkedPricedCount: number;
  checkedPricedTotal: number;
  checkedNoPriceCount: number;
  loggedCount: number;
}

export async function getGroceryPageData(userId: string): Promise<GroceryPageData> {
  const monthKey = monthKeyFromDate(new Date());
  const range = monthRange(monthKey);
  if (!range) {
    throw new Error("Invalid month range for grocery data");
  }
  const [rows, bucketRows, expenses, monthIncome] = await Promise.all([
    prisma.groceryItem.findMany({
      where: { userId },
      orderBy: [{ isPurchased: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
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
    prisma.expense.findMany({
      where: {
        userId,
        occurredAt: { gte: range.start, lte: range.end },
        bucketId: { not: null },
      },
      select: {
        bucketId: true,
        amount: true,
      },
    }),
    getIncomeForMonth(userId, range.start.getFullYear(), range.start.getMonth() + 1),
  ]);

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
      (spentByBucket.get(expense.bucketId) ?? 0) + toNumber(expense.amount),
    );
  }
  const bucketsForLogging = monthScopedBuckets.map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    color: bucket.color,
    remaining: Math.max(
      0,
      Math.round(bucket.allocatedAmount - (spentByBucket.get(bucket.id) ?? 0)),
    ),
  }));

  const items: GroceryItemRecord[] = rows.map((r) => ({
    id: r.id,
    label: r.label,
    quantity: r.quantity,
    estimatedPrice: r.estimatedPrice === null ? null : toNumber(r.estimatedPrice),
    isPurchased: r.isPurchased,
    movedToExpenses: r.movedToExpenses,
    movedToExpensesAt: r.movedToExpensesAt,
    sortOrder: r.sortOrder,
  }));

  let pricedTotal = 0;
  let pricedCount = 0;
  let deferredCount = 0;
  let checkedPricedCount = 0;
  let checkedPricedTotal = 0;
  let checkedNoPriceCount = 0;
  let loggedCount = 0;

  for (const r of rows) {
    if (r.estimatedPrice === null) {
      deferredCount += 1;
      if (r.isPurchased) checkedNoPriceCount += 1;
    } else {
      pricedCount += 1;
      if (!r.isPurchased) {
        pricedTotal += toNumber(r.estimatedPrice);
      }
      if (r.isPurchased) {
        checkedPricedCount += 1;
        checkedPricedTotal += toNumber(r.estimatedPrice);
      }
    }

    if (r.movedToExpenses) {
      loggedCount += 1;
    }
  }

  return {
    monthKey,
    items,
    bucketsForLogging,
    pricedTotal,
    pricedCount,
    deferredCount,
    checkedPricedCount,
    checkedPricedTotal,
    checkedNoPriceCount,
    loggedCount,
  };
}

import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dashboard/get-dashboard-data";
import { toNumber } from "@/lib/income/money";

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
  buckets: Array<{ id: string; name: string; color: string }>;
  totalSpent: number;
  byCategory: Record<string, number>;
}

export async function getExpensesPageData(
  userId: string,
  monthKey: string,
): Promise<ExpensesPageData | null> {
  const range = monthRange(monthKey);
  if (!range) return null;

  const [expenseRows, buckets] = await Promise.all([
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
      select: { id: true, name: true, color: true },
    }),
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

  return {
    monthKey,
    expenses,
    buckets,
    totalSpent,
    byCategory,
  };
}

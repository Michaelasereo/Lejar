import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { dateInputToDate } from "@/lib/investments/dates";
import { applyMonthlyBucketOverridesToBudgets } from "@/lib/income/monthly-bucket-overrides";
import { monthRange } from "@/lib/dashboard/get-dashboard-data";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { getIncomeForMonth } from "@/lib/utils/income";
import { evaluateStreaks } from "@/lib/utils/streaks";
import { createExpenseSchema } from "@/lib/validations/expense";

interface BucketBalanceWarning {
  insufficientBucketBalance: boolean;
  bucketName: string;
  shortfall: number;
  remainingBefore: number;
  remainingAfter: number;
}

async function getBucketBalanceWarningForExpense(
  userId: string,
  bucketId: string,
  occurredAt: Date,
  expenseAmount: number,
): Promise<BucketBalanceWarning | null> {
  const monthKey = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}`;
  const range = monthRange(monthKey);
  if (!range) return null;

  const [bucketRows, monthIncome, monthlyExpenses] = await Promise.all([
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
  ]);

  const bucketBase = bucketRows.map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    color: bucket.color,
    allocatedAmount:
      typeof bucket.percentage === "number" && bucket.percentage > 0
        ? Math.round((bucket.percentage / 100) * monthIncome)
        : Number(bucket.allocatedAmount),
    percentage: bucket.percentage ?? 0,
  }));
  const monthScopedBuckets = await applyMonthlyBucketOverridesToBudgets(
    prisma,
    userId,
    range.start.getFullYear(),
    range.start.getMonth() + 1,
    bucketBase,
  );

  const targetBucket = monthScopedBuckets.find((bucket) => bucket.id === bucketId);
  if (!targetBucket) return null;

  const spentBefore = monthlyExpenses.reduce((sum, expense) => {
    if (expense.bucketId !== bucketId) return sum;
    return sum + Number(expense.amount);
  }, 0);
  const allocated = Math.round(targetBucket.allocatedAmount);
  const remainingBefore = allocated - Math.round(spentBefore - expenseAmount);
  const remainingAfter = allocated - Math.round(spentBefore);

  if (remainingAfter >= 0) return null;
  return {
    insufficientBucketBalance: true,
    bucketName: targetBucket.name,
    shortfall: Math.abs(remainingAfter),
    remainingBefore,
    remainingAfter,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = createExpenseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const occurredAt = dateInputToDate(body.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const b = await prisma.bucket.findFirst({
    where: { id: body.bucketId, userId: auth.user.id },
  });
  if (!b) {
    return NextResponse.json({ error: "Bucket not found" }, { status: 400 });
  }

  const labelTrim = body.label?.trim();
  const label = labelTrim && labelTrim.length > 0 ? labelTrim : null;

  try {
    const row = await prisma.expense.create({
      data: {
        userId: auth.user.id,
        bucketId: body.bucketId,
        amount: new Prisma.Decimal(body.amount),
        category: body.category,
        label,
        occurredAt,
      },
    });
    await refreshSnapshotsForMonths(prisma, auth.user.id, [
      { year: row.occurredAt.getFullYear(), month: row.occurredAt.getMonth() + 1 },
    ]);
    await evaluateStreaks(auth.user.id);
    const bucketBalance = row.bucketId
      ? await getBucketBalanceWarningForExpense(
          auth.user.id,
          row.bucketId,
          row.occurredAt,
          Number(row.amount),
        )
      : null;

    return NextResponse.json(
      {
        id: row.id,
        amount: row.amount.toString(),
        category: row.category,
        label: row.label,
        occurredAt: row.occurredAt.toISOString(),
        bucketId: row.bucketId,
        bucketBalance,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create expense" }, { status: 500 });
  }
}

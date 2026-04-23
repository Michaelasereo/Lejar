import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { dateInputToDate } from "@/lib/investments/dates";
import { applyMonthlyBucketOverridesToBudgets } from "@/lib/income/monthly-bucket-overrides";
import { monthRange } from "@/lib/dashboard/get-dashboard-data";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { getIncomeForMonth } from "@/lib/utils/income";
import { updateExpenseSchema } from "@/lib/validations/expense";

type RouteContext = { params: { id: string } };

interface BucketBalanceWarning {
  insufficientBucketBalance: boolean;
  bucketName: string;
  shortfall: number;
  remainingBefore: number;
  remainingAfter: number;
}

async function getBucketBalanceWarningAfterUpdate(
  userId: string,
  expenseId: string,
  bucketId: string,
  occurredAt: Date,
  amountBefore: number,
  amountAfter: number,
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
        id: { not: expenseId },
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

  const spentWithoutTargetExpense = monthlyExpenses.reduce((sum, expense) => {
    if (expense.bucketId !== bucketId) return sum;
    return sum + Number(expense.amount);
  }, 0);
  const allocated = Math.round(targetBucket.allocatedAmount);
  const remainingBefore = allocated - Math.round(spentWithoutTargetExpense + amountBefore);
  const remainingAfter = allocated - Math.round(spentWithoutTargetExpense + amountAfter);

  if (remainingAfter >= 0) return null;
  return {
    insufficientBucketBalance: true,
    bucketName: targetBucket.name,
    shortfall: Math.abs(remainingAfter),
    remainingBefore,
    remainingAfter,
  };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const json: unknown = await req.json();
  const parsed = updateExpenseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.expense.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  if (data.bucketId !== undefined) {
    const b = await prisma.bucket.findFirst({
      where: { id: data.bucketId, userId: auth.user.id },
    });
    if (!b) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 400 });
    }
  }

  const updateData: {
    amount?: Prisma.Decimal;
    category?: string;
    label?: string | null;
    bucketId?: string;
    occurredAt?: Date;
  } = {};

  if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
  if (data.category !== undefined) updateData.category = data.category;
  if (data.label !== undefined) {
    if (data.label === null) {
      updateData.label = null;
    } else {
      const t = data.label.trim();
      updateData.label = t.length > 0 ? t : null;
    }
  }
  if (data.bucketId !== undefined) {
    updateData.bucketId = data.bucketId;
  }
  if (data.occurredAt !== undefined) {
    const d = dateInputToDate(data.occurredAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    updateData.occurredAt = d;
  }

  try {
    const row = await prisma.expense.update({
      where: { id },
      data: updateData,
    });
    const bucketBalance = row.bucketId
      ? await getBucketBalanceWarningAfterUpdate(
          auth.user.id,
          row.id,
          row.bucketId,
          row.occurredAt,
          existing.bucketId === row.bucketId &&
            existing.occurredAt.getFullYear() === row.occurredAt.getFullYear() &&
            existing.occurredAt.getMonth() === row.occurredAt.getMonth()
            ? Number(existing.amount)
            : 0,
          Number(row.amount),
        )
      : null;
    await refreshSnapshotsForMonths(prisma, auth.user.id, [
      {
        year: existing.occurredAt.getFullYear(),
        month: existing.occurredAt.getMonth() + 1,
      },
      { year: row.occurredAt.getFullYear(), month: row.occurredAt.getMonth() + 1 },
    ]);
    return NextResponse.json({
      id: row.id,
      amount: row.amount.toString(),
      category: row.category,
      label: row.label,
      occurredAt: row.occurredAt.toISOString(),
      bucketId: row.bucketId,
      bucketBalance,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update expense" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const existing = await prisma.expense.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.expense.delete({ where: { id } });
    await refreshSnapshotsForMonths(prisma, auth.user.id, [
      {
        year: existing.occurredAt.getFullYear(),
        month: existing.occurredAt.getMonth() + 1,
      },
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete expense" }, { status: 500 });
  }
}

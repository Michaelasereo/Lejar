import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { applyMonthlyBucketOverridesToBudgets } from "@/lib/income/monthly-bucket-overrides";
import { prisma } from "@/lib/prisma";
import { getIncomeForMonth } from "@/lib/utils/income";
import { monthKeyFromDate, monthRange } from "@/lib/dashboard/get-dashboard-data";
import { dateInputToDate } from "@/lib/investments/dates";
import { logSelectedGroceryItemsSchema } from "@/lib/validations/grocery";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const parsed = logSelectedGroceryItemsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const occurredAt = dateInputToDate(parsed.data.date);
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const selectedItems = await prisma.groceryItem.findMany({
    where: {
      id: { in: parsed.data.itemIds },
      userId: auth.user.id,
      isPurchased: true,
      estimatedPrice: { not: null },
    },
  });

  const loggableItems = selectedItems.filter((item) => !item.movedToExpenses);
  if (loggableItems.length === 0) {
    return NextResponse.json({ error: "No valid items to log" }, { status: 400 });
  }

  const amount = loggableItems.reduce(
    (sum, item) => sum + Number(item.estimatedPrice?.toString() ?? "0"),
    0,
  );
  if (amount <= 0) {
    return NextResponse.json({ error: "Selected total must be greater than zero" }, { status: 400 });
  }

  const note = parsed.data.note?.trim();
  const expenseLabel = note
    ? `${parsed.data.label.trim()} — ${note}`
    : parsed.data.label.trim();
  const occurredMonthKey = monthKeyFromDate(occurredAt);
  const occurredMonthRange = monthRange(occurredMonthKey);
  if (!occurredMonthRange) {
    return NextResponse.json({ error: "Invalid expense month" }, { status: 400 });
  }

  const [bucketRows, existingMonthExpenses, monthIncome] = await Promise.all([
    prisma.bucket.findMany({
      where: { userId: auth.user.id },
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
        userId: auth.user.id,
        occurredAt: { gte: occurredMonthRange.start, lte: occurredMonthRange.end },
        bucketId: { not: null },
      },
      select: {
        bucketId: true,
        amount: true,
      },
    }),
    getIncomeForMonth(
      auth.user.id,
      occurredMonthRange.start.getFullYear(),
      occurredMonthRange.start.getMonth() + 1,
    ),
  ]);

  const bucketBase = bucketRows.map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    allocatedAmount:
      typeof bucket.percentage === "number" && bucket.percentage > 0
        ? Math.round((bucket.percentage / 100) * monthIncome)
        : Number(bucket.allocatedAmount),
    percentage: bucket.percentage ?? 0,
  }));
  const monthScopedBuckets = await applyMonthlyBucketOverridesToBudgets(
    prisma,
    auth.user.id,
    occurredMonthRange.start.getFullYear(),
    occurredMonthRange.start.getMonth() + 1,
    bucketBase,
  );
  const spentByBucket = new Map<string, number>();
  for (const expenseRow of existingMonthExpenses) {
    if (!expenseRow.bucketId) continue;
    spentByBucket.set(
      expenseRow.bucketId,
      (spentByBucket.get(expenseRow.bucketId) ?? 0) + Number(expenseRow.amount),
    );
  }
  const bucketRemaining = monthScopedBuckets.map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    remaining: Math.max(
      0,
      Math.round(bucket.allocatedAmount - (spentByBucket.get(bucket.id) ?? 0)),
    ),
  }));

  try {
    const result = await prisma.$transaction(async (tx) => {
      let createdExpenseIds: string[] = [];
      if (parsed.data.spendMode === "BUCKET") {
        if (!parsed.data.bucketId) {
          throw new Error("Bucket is required for BUCKET spend mode");
        }
        const selectedBucket = bucketRemaining.find((bucket) => bucket.id === parsed.data.bucketId);
        if (!selectedBucket) {
          throw new Error("Selected bucket not found");
        }
        if (selectedBucket.remaining < amount) {
          throw new Error("Selected bucket balance is not enough");
        }
        const expense = await tx.expense.create({
          data: {
            userId: auth.user.id,
            bucketId: selectedBucket.id,
            amount: new Prisma.Decimal(amount),
            category: parsed.data.category,
            label: expenseLabel,
            occurredAt,
          },
        });
        createdExpenseIds = [expense.id];
      } else {
        const sortedBuckets = [...bucketRemaining].sort((a, b) => b.remaining - a.remaining);
        const totalRemaining = sortedBuckets.reduce((sum, bucket) => sum + bucket.remaining, 0);
        if (totalRemaining < amount) {
          throw new Error("Total bucket balance is not enough");
        }
        let leftToAllocate = amount;
        for (const bucket of sortedBuckets) {
          if (leftToAllocate <= 0) break;
          if (bucket.remaining <= 0) continue;
          const portion = Math.min(bucket.remaining, leftToAllocate);
          const expense = await tx.expense.create({
            data: {
              userId: auth.user.id,
              bucketId: bucket.id,
              amount: new Prisma.Decimal(portion),
              category: parsed.data.category,
              label: expenseLabel,
              occurredAt,
            },
          });
          createdExpenseIds.push(expense.id);
          leftToAllocate -= portion;
        }
      }

      await tx.groceryItem.updateMany({
        where: {
          id: { in: loggableItems.map((item) => item.id) },
          userId: auth.user.id,
        },
        data: {
          movedToExpenses: true,
          movedToExpensesAt: new Date(),
          expenseId: createdExpenseIds[0] ?? null,
        },
      });

      return {
        expenseIds: createdExpenseIds,
        amount,
        loggedCount: loggableItems.length,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not log selected grocery items" }, { status: 500 });
  }
}

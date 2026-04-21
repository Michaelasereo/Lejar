import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId: auth.user.id,
          amount: new Prisma.Decimal(amount),
          category: parsed.data.category,
          label: expenseLabel,
          occurredAt,
        },
      });

      await tx.groceryItem.updateMany({
        where: {
          id: { in: loggableItems.map((item) => item.id) },
          userId: auth.user.id,
        },
        data: {
          movedToExpenses: true,
          movedToExpensesAt: new Date(),
          expenseId: expense.id,
        },
      });

      return {
        expenseId: expense.id,
        amount,
        loggedCount: loggableItems.length,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not log selected grocery items" }, { status: 500 });
  }
}

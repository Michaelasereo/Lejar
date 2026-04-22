import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { dateInputToDate } from "@/lib/investments/dates";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { updateExpenseSchema } from "@/lib/validations/expense";

type RouteContext = { params: { id: string } };

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

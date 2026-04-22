import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { dateInputToDate } from "@/lib/investments/dates";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { evaluateStreaks } from "@/lib/utils/streaks";
import { createExpenseSchema } from "@/lib/validations/expense";

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

  let bucketId: string | null = null;
  if (body.bucketId !== undefined && body.bucketId !== null) {
    const b = await prisma.bucket.findFirst({
      where: { id: body.bucketId, userId: auth.user.id },
    });
    if (!b) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 400 });
    }
    bucketId = body.bucketId;
  }

  const labelTrim = body.label?.trim();
  const label = labelTrim && labelTrim.length > 0 ? labelTrim : null;

  try {
    const row = await prisma.expense.create({
      data: {
        userId: auth.user.id,
        bucketId,
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

    return NextResponse.json(
      {
        id: row.id,
        amount: row.amount.toString(),
        category: row.category,
        label: row.label,
        occurredAt: row.occurredAt.toISOString(),
        bucketId: row.bucketId,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create expense" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { updateIncomeSchema } from "@/lib/validations/income-api";

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const json: unknown = await req.json();
  const parsed = updateIncomeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.incomeSource.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: { label?: string; amountMonthly?: Prisma.Decimal } = {};
  if (parsed.data.label !== undefined) data.label = parsed.data.label;
  if (parsed.data.amountMonthly !== undefined) {
    data.amountMonthly = new Prisma.Decimal(parsed.data.amountMonthly);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  try {
    const row = await prisma.incomeSource.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      id: row.id,
      label: row.label,
      amountMonthly: row.amountMonthly.toString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update income source" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const existing = await prisma.incomeSource.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.incomeSource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete income source" }, { status: 500 });
  }
}

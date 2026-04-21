import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { dateInputToDate } from "@/lib/investments/dates";
import { prisma } from "@/lib/prisma";
import { updateInvestmentSchema } from "@/lib/validations/investment";

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const json: unknown = await req.json();
  const parsed = updateInvestmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.investment.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const nextType = data.type ?? existing.type;

  let nextMaturity: Date | null | undefined = existing.maturityDate;
  if (data.maturityDate !== undefined) {
    if (data.maturityDate === null || data.maturityDate === "") {
      nextMaturity = null;
    } else {
      const d = dateInputToDate(data.maturityDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid maturity date" }, { status: 400 });
      }
      nextMaturity = d;
    }
  }

  if (nextType === "T_BILL" && !nextMaturity) {
    return NextResponse.json(
      { error: "T-Bills require a maturity date" },
      { status: 400 },
    );
  }

  const updateData: {
    type?: string;
    label?: string;
    amount?: Prisma.Decimal;
    expectedProfit?: Prisma.Decimal | null;
    investedAt?: Date;
    maturityDate?: Date | null;
    status?: "ACTIVE" | "MATURED" | "MATURED_CONFIRMED" | "ROLLED_OVER" | "WITHDRAWN";
  } = {};

  if (data.type !== undefined) updateData.type = data.type;
  if (data.label !== undefined) updateData.label = data.label;
  if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
  if (data.expectedProfit !== undefined) {
    updateData.expectedProfit =
      data.expectedProfit === null ? null : new Prisma.Decimal(data.expectedProfit);
  }
  if (data.investedAt !== undefined) {
    const d = dateInputToDate(data.investedAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid investment date" }, { status: 400 });
    }
    updateData.investedAt = d;
  }
  if (data.maturityDate !== undefined) {
    updateData.maturityDate = nextMaturity ?? null;
  }
  if (data.status !== undefined) updateData.status = data.status;

  try {
    const row = await prisma.investment.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({
      id: row.id,
      type: row.type,
      label: row.label,
      amount: row.amount.toString(),
      investedAt: row.investedAt.toISOString(),
      maturityDate: row.maturityDate?.toISOString() ?? null,
      status: row.status,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update investment" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const existing = await prisma.investment.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.investment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete investment" }, { status: 500 });
  }
}

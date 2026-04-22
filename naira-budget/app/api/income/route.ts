import { NextRequest, NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { recalculateAllocationAmountsForUser } from "@/lib/income/recalculate-allocation-amounts";
import { prisma } from "@/lib/prisma";
import { getCurrentIncome } from "@/lib/utils/income";
import { createIncomeSchema } from "@/lib/validations/income-api";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const rows = await getCurrentIncome(auth.user.id);
  return NextResponse.json({
    income: rows.map((row) => ({
      id: row.id,
      label: row.label,
      amountMonthly: Number(row.amountMonthly),
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = createIncomeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { label, amountMonthly, effectiveFrom } = parsed.data;

  try {
    const row = await prisma.incomeSource.create({
      data: {
        userId: auth.user.id,
        label,
        amountMonthly: new Prisma.Decimal(amountMonthly),
        effectiveFrom: effectiveFrom
          ? startOfMonth(new Date(`${effectiveFrom}-01T00:00:00.000Z`))
          : startOfMonth(new Date()),
        effectiveTo: null,
        isActive: true,
      },
    });
    const recalc = await recalculateAllocationAmountsForUser(auth.user.id);

    return NextResponse.json(
      {
        id: row.id,
        label: row.label,
        amountMonthly: row.amountMonthly.toString(),
        allocationsRecalculated: recalc.updatedCount > 0,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create income source" }, { status: 500 });
  }
}

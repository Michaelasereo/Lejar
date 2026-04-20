import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { dateInputToDate } from "@/lib/investments/dates";
import { prisma } from "@/lib/prisma";
import { createInvestmentSchema } from "@/lib/validations/investment";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = createInvestmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const investedAt = dateInputToDate(body.investedAt);
  if (Number.isNaN(investedAt.getTime())) {
    return NextResponse.json({ error: "Invalid investment date" }, { status: 400 });
  }

  let maturityDate: Date | null = null;
  if (body.maturityDate && body.maturityDate.trim() !== "") {
    maturityDate = dateInputToDate(body.maturityDate);
    if (Number.isNaN(maturityDate.getTime())) {
      return NextResponse.json({ error: "Invalid maturity date" }, { status: 400 });
    }
  }

  if (body.type === "T_BILL" && !maturityDate) {
    return NextResponse.json(
      { error: "T-Bills require a maturity date" },
      { status: 400 },
    );
  }

  try {
    const row = await prisma.investment.create({
      data: {
        userId: auth.user.id,
        type: body.type,
        label: body.label,
        amount: new Prisma.Decimal(body.amount),
        investedAt,
        maturityDate,
        status: body.status ?? "ACTIVE",
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        type: row.type,
        label: row.label,
        amount: row.amount.toString(),
        investedAt: row.investedAt.toISOString(),
        maturityDate: row.maturityDate?.toISOString() ?? null,
        status: row.status,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create investment" }, { status: 500 });
  }
}

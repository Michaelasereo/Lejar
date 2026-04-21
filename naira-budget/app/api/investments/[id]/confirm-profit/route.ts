import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { confirmInvestmentProfitSchema } from "@/lib/validations/investment";

type RouteContext = { params: { id: string } };

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const parsed = confirmInvestmentProfitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id } = context.params;
  const existing = await prisma.investment.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Investment not found" }, { status: 404 });
  }
  if (existing.status !== "MATURED") {
    return NextResponse.json({ error: "Only matured investments can be confirmed" }, { status: 400 });
  }

  try {
    const row = await prisma.investment.update({
      where: { id },
      data: {
        actualProfit: new Prisma.Decimal(parsed.data.actualProfit),
        profitConfirmed: true,
        profitConfirmedAt: new Date(),
        status: "MATURED_CONFIRMED",
      },
    });
    return NextResponse.json({
      id: row.id,
      status: row.status,
      actualProfit: row.actualProfit?.toString() ?? null,
      profitConfirmed: row.profitConfirmed,
      profitConfirmedAt: row.profitConfirmedAt?.toISOString() ?? null,
      notes: parsed.data.notes ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not confirm profit" }, { status: 500 });
  }
}

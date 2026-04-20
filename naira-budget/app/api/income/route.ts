import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { createIncomeSchema } from "@/lib/validations/income-api";

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

  const { label, amountMonthly } = parsed.data;

  try {
    const row = await prisma.incomeSource.create({
      data: {
        userId: auth.user.id,
        label,
        amountMonthly: new Prisma.Decimal(amountMonthly),
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        label: row.label,
        amountMonthly: row.amountMonthly.toString(),
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create income source" }, { status: 500 });
  }
}

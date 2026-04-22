import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { monthlyIncomeOverrideSchema } from "@/lib/validations/income-api";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const rows = await prisma.monthlyIncomeOverride.findMany({
    where: { userId: auth.user.id },
    orderBy: { monthKey: "asc" },
  });

  return NextResponse.json({
    overrides: rows.map((row) => ({
      id: row.id,
      monthKey: row.monthKey,
      amount: Number(row.amount),
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = monthlyIncomeOverrideSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [yearStr, monthStr] = parsed.data.monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid monthKey" }, { status: 400 });
  }

  const row = await prisma.monthlyIncomeOverride.upsert({
    where: { userId_monthKey: { userId: auth.user.id, monthKey: parsed.data.monthKey } },
    update: {
      amount: new Prisma.Decimal(parsed.data.amount),
      note: parsed.data.note?.trim() || null,
    },
    create: {
      userId: auth.user.id,
      monthKey: parsed.data.monthKey,
      amount: new Prisma.Decimal(parsed.data.amount),
      note: parsed.data.note?.trim() || null,
    },
  });

  await refreshSnapshotsForMonths(prisma, auth.user.id, [{ year, month }]);

  return NextResponse.json(
    {
      id: row.id,
      monthKey: row.monthKey,
      amount: Number(row.amount),
      note: row.note,
    },
    { status: 201 },
  );
}

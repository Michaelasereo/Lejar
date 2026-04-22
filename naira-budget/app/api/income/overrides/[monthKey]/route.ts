import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { monthKey: string } };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { monthKey } = context.params;
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return NextResponse.json({ error: "Invalid monthKey" }, { status: 400 });
  }

  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  await prisma.monthlyIncomeOverride.deleteMany({
    where: { userId: auth.user.id, monthKey },
  });

  await prisma.monthlySnapshot.updateMany({
    where: { userId: auth.user.id, year, month },
    data: { needsRecalculation: true },
  });

  return NextResponse.json({ ok: true });
}

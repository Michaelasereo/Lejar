import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { earliestUserMonth, refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { getMonthsBetween } from "@/lib/utils/dates";

export async function POST() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const now = new Date();
  const earliest = await earliestUserMonth(prisma, auth.user.id);
  const fallbackStart = { year: now.getFullYear(), month: 1 };
  const start = earliest ?? fallbackStart;
  const months = getMonthsBetween(
    start.year,
    start.month,
    now.getFullYear(),
    now.getMonth() + 1,
  );
  const rebuiltCount = await refreshSnapshotsForMonths(prisma, auth.user.id, months);

  return NextResponse.json({
    ok: true,
    rebuiltCount,
    from: `${start.year}-${String(start.month).padStart(2, "0")}`,
    to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  });
}

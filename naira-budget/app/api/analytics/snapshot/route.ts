import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import {
  checkNetWorthMilestones,
  evaluateMonthlyBudgetStreak,
  evaluateMonthlySavingsStreak,
  getMonthlySavingsInput,
} from "@/lib/utils/streaks";
import { calculateCurrentNetWorth } from "@/lib/utils/networth";
import { analyticsSnapshotBodySchema } from "@/lib/validations/analytics-api";
import { upsertMonthlySnapshotForMonth } from "@/lib/utils/analytics";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = analyticsSnapshotBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await upsertMonthlySnapshotForMonth(prisma, auth.user.id, {
      year: parsed.data.year,
      month: parsed.data.month,
    });
    const { totalIncome, totalSaved } = await getMonthlySavingsInput(
      auth.user.id,
      parsed.data.year,
      parsed.data.month,
    );
    await Promise.all([
      evaluateMonthlySavingsStreak(
        auth.user.id,
        parsed.data.year,
        parsed.data.month,
        totalIncome,
        totalSaved,
      ),
      evaluateMonthlyBudgetStreak(auth.user.id, parsed.data.year, parsed.data.month),
    ]);
    const netWorthData = await calculateCurrentNetWorth(auth.user.id);
    const newMilestones = await checkNetWorthMilestones(auth.user.id, netWorthData.netWorth);
    return NextResponse.json({ ok: true, newMilestones });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save snapshot" }, { status: 500 });
  }
}

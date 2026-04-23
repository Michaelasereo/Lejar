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
import { safelySendEmail, sendMonthlySummary } from "@/lib/email";

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
    const currentSnapshot = await prisma.monthlySnapshot.findUnique({
      where: {
        userId_year_month: {
          userId: auth.user.id,
          year: parsed.data.year,
          month: parsed.data.month,
        },
      },
      select: {
        totalIncome: true,
        totalSaved: true,
        totalExpenses: true,
        netWorth: true,
        expenseByCategory: true,
      },
    });
    const prevYear = parsed.data.month === 1 ? parsed.data.year - 1 : parsed.data.year;
    const prevMonth = parsed.data.month === 1 ? 12 : parsed.data.month - 1;
    const previousSnapshot = await prisma.monthlySnapshot.findUnique({
      where: {
        userId_year_month: {
          userId: auth.user.id,
          year: prevYear,
          month: prevMonth,
        },
      },
      select: { netWorth: true },
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
    if (auth.user.email && currentSnapshot) {
      const byCategory =
        (currentSnapshot.expenseByCategory as Record<string, number> | null) ?? {};
      const topCategoryEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
      await safelySendEmail(() =>
        sendMonthlySummary({
          toEmail: auth.user.email!,
          name:
            (auth.user.user_metadata?.full_name as string | undefined)?.trim() ||
            "there",
          year: parsed.data.year,
          month: parsed.data.month,
          totalIncome: Number(currentSnapshot.totalIncome),
          totalSaved: Number(currentSnapshot.totalSaved),
          totalSpent: Number(currentSnapshot.totalExpenses),
          netWorth: Number(currentSnapshot.netWorth),
          previousNetWorth: Number(previousSnapshot?.netWorth ?? 0),
          topSpendCategory: topCategoryEntry?.[0] ?? "Other",
          topSpendAmount: topCategoryEntry?.[1] ?? 0,
        }),
      );
    }
    const netWorthData = await calculateCurrentNetWorth(auth.user.id);
    const newMilestones = await checkNetWorthMilestones(auth.user.id, netWorthData.netWorth);
    return NextResponse.json({ ok: true, newMilestones });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save snapshot" }, { status: 500 });
  }
}

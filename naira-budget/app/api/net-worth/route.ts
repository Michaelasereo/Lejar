import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { parseMonthParam } from "@/lib/utils/dates";
import {
  calculateCurrentNetWorth,
  calculateUnspentCarryover,
  getNetWorthHistory,
  getPreviousMonthNetWorth,
  monthlyChangeBreakdown,
} from "@/lib/utils/networth";
import { checkNetWorthMilestones } from "@/lib/utils/streaks";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month") ?? undefined;
  const { year, month } = parseMonthParam(monthParam);

  const [netWorthData, netWorthHistory, unspentCarryover, previousMonthNetWorth, change] =
    await Promise.all([
      calculateCurrentNetWorth(auth.user.id),
      getNetWorthHistory(auth.user.id),
      calculateUnspentCarryover(auth.user.id, year, month),
      getPreviousMonthNetWorth(auth.user.id, year, month),
      monthlyChangeBreakdown(auth.user.id, year, month),
    ]);

  const newMilestones = await checkNetWorthMilestones(auth.user.id, netWorthData.netWorth);

  return NextResponse.json({
    netWorthData,
    netWorthHistory,
    unspentCarryover,
    previousMonthNetWorth,
    monthlyChange: change,
    newMilestones,
  });
}

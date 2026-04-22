import { Suspense } from "react";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { formatMonthParam, parseMonthParam } from "@/lib/utils/dates";
import {
  calculateCurrentNetWorth,
  getNetWorthHistory,
  getPreviousMonthNetWorth,
  monthlyChangeBreakdown,
  calculateUnspentCarryover,
} from "@/lib/utils/networth";
import { NetWorthPanel } from "@/components/analytics/net-worth-panel";
import { prisma } from "@/lib/prisma";
import { checkNetWorthMilestones, getUserStreaks } from "@/lib/utils/streaks";
import { StreaksPanel } from "@/components/analytics/streaks-panel";

export const metadata: Metadata = {
  title: "Analytics — Orjar",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { tab?: string; month?: string };
}) {
  const tab = searchParams.tab ?? "overview";
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const month = parseMonthParam(searchParams.month);
  const monthLabel = new Date(month.year, month.month - 1, 1).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "spending", label: "Spending" },
    { id: "savings", label: "Savings" },
    { id: "networth", label: "Net Worth" },
    { id: "streaks", label: "Streaks" },
  ] as const;

  let networthContent: ReactNode = null;
  let streaksContent: ReactNode = null;
  if (tab === "networth") {
    const [netWorthData, netWorthHistory, previousMonthNetWorth, monthlyChange, unspentCarryover] =
      await Promise.all([
        calculateCurrentNetWorth(user.id),
        getNetWorthHistory(user.id),
        getPreviousMonthNetWorth(user.id, month.year, month.month),
        monthlyChangeBreakdown(user.id, month.year, month.month),
        calculateUnspentCarryover(user.id, month.year, month.month),
      ]);
    const newMilestones = await checkNetWorthMilestones(user.id, netWorthData.netWorth);
    networthContent = (
      <NetWorthPanel
        asOfLabel={monthLabel}
        previousMonthNetWorth={previousMonthNetWorth}
        netWorthData={netWorthData}
        netWorthHistory={netWorthHistory}
        monthlyChange={monthlyChange}
        unspentCarryover={unspentCarryover}
        newMilestones={newMilestones}
      />
    );
  }
  if (tab === "streaks") {
    const [streaks, milestones] = await Promise.all([
      getUserStreaks(user.id),
      prisma.userMilestone.findMany({
        where: { userId: user.id },
        orderBy: { achievedAt: "desc" },
        take: 40,
      }),
    ]);
    streaksContent = <StreaksPanel streaks={streaks} milestones={milestones} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/app/analytics?tab=${t.id}&month=${formatMonthParam(month.year, month.month)}`}
            className={
              tab === t.id
                ? "border border-white bg-white px-3 py-1 text-sm text-black"
                : "border border-white/10 px-3 py-1 text-sm text-white/50 hover:text-white/80"
            }
          >
            {t.label}
          </Link>
        ))}
      </div>
      {tab === "networth" ? networthContent : null}
      {tab === "streaks" ? streaksContent : null}
      {tab !== "networth" && tab !== "streaks" ? (
        <Suspense fallback={<p className="text-sm text-white/40">Loading analytics…</p>}>
          <AnalyticsView />
        </Suspense>
      ) : null}
    </div>
  );
}

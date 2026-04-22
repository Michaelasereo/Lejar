import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  getDashboardData,
  monthKeyFromDate,
  monthRange,
} from "@/lib/dashboard/get-dashboard-data";
import { formatMonthParam, parseMonthParam } from "@/lib/utils/dates";
import { WealthProjectionChart } from "@/components/dashboard/wealth-projection-chart";

export const metadata: Metadata = {
  title: "Projection — Orjar",
};

export default async function ProjectionPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsedMonth = parseMonthParam(searchParams.month);
  let monthKey = formatMonthParam(parsedMonth.year, parsedMonth.month);
  if (!monthRange(monthKey)) {
    monthKey = monthKeyFromDate(new Date());
  }

  const data = await getDashboardData(user.id, monthKey);
  if (!data) {
    redirect("/app/projection");
  }

  return (
    <>
      <p className="text-xs uppercase tracking-widest text-white/30">Forecast</p>
      <h1 className="mt-2 text-2xl font-medium text-foreground">Wealth projection</h1>
      <p className="mt-2 max-w-xl text-sm text-white/45">
        Based on your surplus this month and a blended return assumption — same engine as Home.
      </p>
      <section className="mt-10 border border-white/8 bg-[#111111] p-6">
        <div className="mt-6">
          <WealthProjectionChart data={data.wealthBars} />
        </div>
        <p className="mt-6 text-center text-sm text-white/60">{data.wealthFinalLine}</p>
      </section>
    </>
  );
}

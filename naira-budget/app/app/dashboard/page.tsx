import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  getDashboardData,
  monthKeyFromDate,
  monthRange,
} from "@/lib/dashboard/get-dashboard-data";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardMonthSync } from "@/components/dashboard/dashboard-month-sync";
import { DashboardFab } from "@/components/dashboard/dashboard-fab";

export const metadata: Metadata = {
  title: "Dashboard — Naira Budget",
};

export default async function DashboardPage({
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

  let monthKey = searchParams.month ?? monthKeyFromDate(new Date());
  if (!monthRange(monthKey)) {
    monthKey = monthKeyFromDate(new Date());
  }

  let data;
  try {
    data = await getDashboardData(user.id, monthKey);
  } catch (err) {
    // Surface concrete DB/Prisma errors to Netlify function logs instead of
    // bubbling an opaque "unknown error" to the client.
    console.error("[dashboard] getDashboardData failed", {
      userId: user.id,
      monthKey,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    throw err;
  }
  if (!data) {
    redirect("/app/dashboard");
  }

  return (
    <>
      <Suspense fallback={null}>
        <DashboardMonthSync />
      </Suspense>
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest text-white/30">Overview</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Dashboard</h1>
      </div>
      <DashboardView data={data} />
      <DashboardFab />
    </>
  );
}

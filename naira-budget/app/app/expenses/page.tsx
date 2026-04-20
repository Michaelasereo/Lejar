import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  monthKeyFromDate,
  monthRange,
} from "@/lib/dashboard/get-dashboard-data";
import { getExpensesPageData } from "@/lib/expenses/get-expenses-page-data";
import { ExpensesClient } from "@/components/expenses/expenses-client";
import { ExpensesMonthSync } from "@/components/expenses/expenses-month-sync";

export const metadata: Metadata = {
  title: "Expenses — Naira Budget",
};

export default async function ExpensesPage({
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

  const data = await getExpensesPageData(user.id, monthKey);
  if (!data) {
    redirect("/app/expenses");
  }

  return (
    <>
      <Suspense fallback={null}>
        <ExpensesMonthSync />
      </Suspense>
      <ExpensesClient data={data} />
    </>
  );
}

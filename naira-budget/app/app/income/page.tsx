import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getIncomePageData } from "@/lib/income/get-income-page-data";
import { IncomeBucketsClient } from "@/components/income/income-buckets-client";
import { IncomeMonthSync } from "@/components/income/income-month-sync";

export const metadata: Metadata = {
  title: "Buckets — Orjar",
};

export default async function IncomePage({
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

  const data = await getIncomePageData(user.id, searchParams.month);
  return (
    <>
      <Suspense fallback={null}>
        <IncomeMonthSync />
      </Suspense>
      <IncomeBucketsClient initialData={data} />
    </>
  );
}

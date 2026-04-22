import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getIncomePageData } from "@/lib/income/get-income-page-data";
import { IncomeBucketsClient } from "@/components/income/income-buckets-client";

export const metadata: Metadata = {
  title: "Buckets — Orjar",
};

export default async function IncomePage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getIncomePageData(user.id);
  return <IncomeBucketsClient initialData={data} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getInvestmentsPageData } from "@/lib/investments/get-investments-page-data";
import { InvestmentsClient } from "@/components/investments/investments-client";

export const metadata: Metadata = {
  title: "Investments — Orjar",
};

export default async function InvestmentsPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getInvestmentsPageData(
    user.id,
    user.email ?? undefined,
    (user.user_metadata?.full_name as string | undefined) ?? undefined,
  );
  return <InvestmentsClient data={data} />;
}

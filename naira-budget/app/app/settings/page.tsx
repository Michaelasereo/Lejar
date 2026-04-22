import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSettingsPageData } from "@/lib/settings/get-settings-page-data";
import { SettingsClient } from "@/components/settings/settings-client";

export const metadata: Metadata = {
  title: "Settings — Orjar",
};

export default async function SettingsPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "";
  const data = await getSettingsPageData(user.id, email);
  return <SettingsClient data={data} />;
}

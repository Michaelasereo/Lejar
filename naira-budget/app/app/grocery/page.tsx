import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getGroceryPageData } from "@/lib/grocery/get-grocery-page-data";
import { GroceryClient } from "@/components/grocery/grocery-client";

export const metadata: Metadata = {
  title: "Grocery — Naira Budget",
};

export default async function GroceryPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getGroceryPageData(user.id);
  return <GroceryClient data={data} />;
}

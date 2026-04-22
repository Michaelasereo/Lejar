import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminUserId } from "@/lib/admin/is-admin-user";
import { getAdminStats } from "@/lib/admin/get-admin-stats";
import { AdminOverview } from "@/components/admin/admin-overview";

export const metadata: Metadata = {
  title: "Admin — Orjar",
};

export default async function AdminPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminUserId(user.id)) {
    redirect("/app/dashboard");
  }

  const stats = await getAdminStats();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-white/30">Admin</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Overview</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Read-only counts across the database. Access is controlled by{" "}
          <code className="rounded-sm bg-white/10 px-1 py-0.5 font-mono text-xs text-white/70">
            ADMIN_USER_IDS
          </code>{" "}
          on the server.
        </p>
      </header>

      <AdminOverview stats={stats} />
    </div>
  );
}

import type { AdminStats } from "@/lib/admin/get-admin-stats";

interface AdminOverviewProps {
  stats: AdminStats;
}

export function AdminOverview({ stats }: AdminOverviewProps) {
  const rows: Array<{ label: string; value: number }> = [
    { label: "User workspaces (settings rows)", value: stats.userSettingsCount },
    { label: "Income sources", value: stats.incomeSourceCount },
    { label: "Buckets", value: stats.bucketCount },
    { label: "Expenses", value: stats.expenseCount },
    { label: "Investments", value: stats.investmentCount },
    { label: "Grocery items", value: stats.groceryItemCount },
    { label: "Rent jars", value: stats.rentJarCount },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="border border-white/10 bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">{row.label}</p>
          <p className="mt-2 text-3xl font-medium tabular-nums text-foreground">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

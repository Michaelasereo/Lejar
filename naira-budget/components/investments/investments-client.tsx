"use client";

import { useRouter } from "next/navigation";
import { AddInvestmentForm } from "@/components/investments/add-investment-form";
import { InvestmentRow } from "@/components/investments/investment-row";
import { investmentTypeLabel } from "@/lib/investments/constants";
import { formatNaira } from "@/lib/utils/currency";
import type { InvestmentsPageData } from "@/lib/investments/get-investments-page-data";
import { cn } from "@/lib/utils/cn";

interface InvestmentsClientProps {
  data: InvestmentsPageData;
}

export function InvestmentsClient({ data }: InvestmentsClientProps) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  const typeEntries = Object.entries(data.byTypeActive).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-white/30">Investments</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Portfolio</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Track T-bills, funds, and other holdings. Active positions roll into your dashboard
          totals and maturity alerts.
        </p>
      </header>

      <section className="rounded-none border border-white/10 bg-card p-4 md:p-6">
        <p className="text-xs uppercase tracking-widest text-white/40">Active portfolio</p>
        <p className="mt-2 text-3xl font-medium tabular-nums text-accent">
          {formatNaira(data.portfolioTotalActive)}
        </p>
        {typeEntries.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {typeEntries.map(([type, amt]) => (
              <li
                key={type}
                className="border border-white/10 bg-background/50 px-3 py-1.5 text-sm text-white/80"
              >
                <span className="text-white/45">{investmentTypeLabel(type)}:</span>{" "}
                <span className="tabular-nums">{formatNaira(amt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/45">No active investments yet.</p>
        )}
      </section>

      {data.maturingSoon.length > 0 && (
        <section
          className={cn(
            "border border-amber-500/25 bg-amber-500/5 p-4",
            "md:p-5",
          )}
        >
          <p className="text-xs uppercase tracking-widest text-amber-400/90">
            Maturing in the next 30 days
          </p>
          <ul className="mt-3 space-y-2">
            {data.maturingSoon.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="text-foreground">{m.label}</span>
                <span className="tabular-nums text-white/80">{formatNaira(m.amount)}</span>
                <span className="tabular-nums text-amber-200/80">
                  {dateLabel(m.maturityDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AddInvestmentForm onCreated={refresh} />

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">All positions</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">History & details</h2>
        </div>
        <div className="px-4">
          {data.investments.length === 0 ? (
            <p className="py-8 text-sm text-white/45">
              No investments recorded. Add one above to get started.
            </p>
          ) : (
            data.investments.map((row) => (
              <InvestmentRow key={row.id} row={row} onSaved={refresh} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

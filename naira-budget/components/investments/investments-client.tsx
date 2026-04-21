"use client";

import { useMemo, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "MATURED">("ACTIVE");

  function refresh() {
    router.refresh();
  }

  const typeEntries = Object.entries(data.byTypeActive).sort((a, b) => b[1] - a[1]);
  const activeRows = useMemo(
    () => data.investments.filter((row) => row.status === "ACTIVE" || row.status === "MATURED"),
    [data.investments],
  );
  const maturedRows = useMemo(
    () =>
      data.investments.filter(
        (row) => row.status === "MATURED_CONFIRMED" || row.status === "WITHDRAWN",
      ),
    [data.investments],
  );
  const awaitingConfirmation = useMemo(
    () => data.investments.filter((row) => row.status === "MATURED"),
    [data.investments],
  );

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

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-none border border-white/10 bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Active portfolio</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-accent">
            {formatNaira(data.portfolioTotalActive)}
          </p>
        </article>
        <article className="rounded-none border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-xs uppercase tracking-widest text-green-400/80">Confirmed returns</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-green-400">
            {formatNaira(data.confirmedReturnsTotal)}
          </p>
        </article>
        <article className="rounded-none border border-white/10 bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Total</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-foreground">
            {formatNaira(data.grandTotal)}
          </p>
        </article>
      </section>

      {typeEntries.length > 0 && (
        <ul className="flex flex-wrap gap-2">
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
      )}

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

      {awaitingConfirmation.length > 0 && (
        <section className="border border-amber-500/25 bg-amber-500/5 p-4 md:p-5">
          <p className="text-xs uppercase tracking-widest text-amber-300/90">
            Profit confirmation required
          </p>
          <ul className="mt-3 space-y-2">
            {awaitingConfirmation.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-foreground">
                  Your {m.label} matured. Confirm your actual profit to add it to your portfolio.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("ACTIVE")}
                  className="border border-accent/50 px-2 py-1 text-xs text-accent"
                >
                  Confirm profit -&gt;
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AddInvestmentForm onCreated={refresh} />

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="inline-flex border border-white/10 bg-background/50 p-1 text-xs uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={cn(
                "px-3 py-1.5",
                activeTab === "ACTIVE"
                  ? "bg-white text-black"
                  : "border border-white/10 text-white/50",
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("MATURED")}
              className={cn(
                "px-3 py-1.5",
                activeTab === "MATURED"
                  ? "bg-white text-black"
                  : "border border-white/10 text-white/50",
              )}
            >
              Matured
            </button>
          </div>
          <h2 className="mt-1 text-lg font-medium text-foreground">History & details</h2>
        </div>
        <div className="px-4">
          {(activeTab === "ACTIVE" ? activeRows : maturedRows).length === 0 ? (
            <p className="py-8 text-sm text-white/45">
              No positions in this tab yet.
            </p>
          ) : (
            <>
              {activeTab === "ACTIVE" &&
                activeRows.map((row) => <InvestmentRow key={row.id} row={row} onSaved={refresh} />)}
              {activeTab === "MATURED" &&
                maturedRows.map((row) => {
                  const totalReturned = row.amount + (row.actualProfit ?? 0);
                  return (
                    <article key={row.id} className="border-b border-white/5 py-3 last:border-b-0">
                      <p className="text-sm text-white/80">
                        {row.label} · {investmentTypeLabel(row.type)}
                      </p>
                      <p className="text-xs text-white/50">
                        Amount invested: {formatNaira(row.amount)}
                      </p>
                      <p className="text-xs text-green-400">
                        Actual profit confirmed: {formatNaira(row.actualProfit ?? 0)}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        Total returned: {formatNaira(totalReturned)}
                      </p>
                      <p className="text-xs text-white/40">
                        Confirmed:{" "}
                        {row.profitConfirmedAt ? dateLabel(row.profitConfirmedAt) : "Not confirmed"}
                      </p>
                      <span
                        className={cn(
                          "mt-1 inline-flex border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                          row.status === "MATURED_CONFIRMED"
                            ? "border-green-500/30 text-green-400"
                            : "border-white/15 text-white/50",
                        )}
                      >
                        {row.status === "MATURED_CONFIRMED" ? "Confirmed ✓" : "Withdrawn"}
                      </span>
                    </article>
                  );
                })}
            </>
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

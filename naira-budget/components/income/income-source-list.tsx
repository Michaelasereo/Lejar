"use client";

import { toast } from "sonner";
import { formatNaira } from "@/lib/utils/currency";
import { parseAmountInput } from "@/lib/income/money";
import { IncomeSourceRow } from "@/components/income/income-source-row";

interface IncomeSourceListProps {
  sources: Array<{ id: string; label: string; amountMonthly: number }>;
  totalIncome: number;
  addDraft: {
    label: string;
    amount: string;
    effectiveFrom: string;
    thisMonthOnly: boolean;
  };
  onAddDraftChange: (next: {
    label: string;
    amount: string;
    effectiveFrom: string;
    thisMonthOnly: boolean;
  }) => void;
  onRefresh: () => void;
}

export function IncomeSourceList({
  sources,
  totalIncome,
  addDraft,
  onAddDraftChange,
  onRefresh,
}: IncomeSourceListProps) {
  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    const label = addDraft.label.trim();
    const amt = parseAmountInput(addDraft.amount);
    if (!label || amt <= 0) {
      toast.error("Enter a label and a positive amount.");
      return;
    }
    const res = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        amountMonthly: amt,
        effectiveFrom: addDraft.effectiveFrom,
        incomeTiming: addDraft.thisMonthOnly ? "MONTH_ONLY" : "RECURRING",
        monthOnlyStorageMode: addDraft.thisMonthOnly ? "BOUNDED_SOURCE" : undefined,
        allocationDirective: { mode: "ADJUST_EXISTING" },
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not add income");
      return;
    }
    const payload = (await res.json().catch(() => ({}))) as {
      allocationsRecalculated?: boolean;
    };
    toast.success("Income source added");
    if (payload.allocationsRecalculated) {
      toast.success("Income updated — bucket allocations recalculated automatically");
    }
    onAddDraftChange({
      ...addDraft,
      label: "",
      amount: "",
      thisMonthOnly: false,
    });
    onRefresh();
  }

  return (
    <section className="border border-white/10 bg-card">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs uppercase tracking-widest text-white/40">Income sources</p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-medium text-foreground">Monthly inflow</h3>
          <p className="text-sm tabular-nums text-accent">
            Total {formatNaira(totalIncome)}
          </p>
        </div>
      </div>

      <div className="px-4">
        {sources.length === 0 ? (
          <p className="py-6 text-sm text-white/45">No income sources yet.</p>
        ) : (
          sources.map((s) => (
            <IncomeSourceRow
              key={s.id}
              id={s.id}
              label={s.label}
              amountMonthly={s.amountMonthly}
              onSaved={onRefresh}
            />
          ))
        )}
      </div>

      <form
        onSubmit={(e) => void addIncome(e)}
        className="border-t border-white/10 px-4 py-4"
      >
        <p className="mb-3 text-xs uppercase tracking-widest text-white/35">Add income source</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <input
            value={addDraft.label}
            onChange={(e) => onAddDraftChange({ ...addDraft, label: e.target.value })}
            placeholder="Label"
            className="min-h-11 min-w-[160px] flex-1 border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            inputMode="decimal"
            value={addDraft.amount}
            onChange={(e) => onAddDraftChange({ ...addDraft, amount: e.target.value })}
            placeholder="Amount"
            className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-40"
          />
          <button
            type="submit"
            className="min-h-11 border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90"
          >
            Add
          </button>
        </div>
        <div className="mt-3 border border-white/10 bg-background/30 p-3">
          <div className="flex items-center gap-2">
            <input
              id="income-this-month-only"
              type="checkbox"
              checked={addDraft.thisMonthOnly}
              onChange={(e) => onAddDraftChange({ ...addDraft, thisMonthOnly: e.target.checked })}
              className="h-4 w-4 border-white/20 bg-background"
            />
            <label htmlFor="income-this-month-only" className="text-sm text-white/80">
              This month only
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/50">Effective month</label>
              <input
                type="month"
                value={addDraft.effectiveFrom}
                onChange={(e) =>
                  onAddDraftChange({
                    ...addDraft,
                    effectiveFrom: e.target.value,
                  })
                }
                className="min-h-10 w-full border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:w-44"
              />
            </div>
            {addDraft.thisMonthOnly ? (
              <p className="text-xs text-white/50 sm:pb-2">
                This will add a separate income source for the selected month.
              </p>
            ) : (
              <p className="text-xs text-white/50 sm:pb-2">
                Unchecked = applies from selected month moving forward.
              </p>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

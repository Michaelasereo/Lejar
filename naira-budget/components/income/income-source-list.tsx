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
    incomeTiming: "MONTH_ONLY" | "RECURRING" | "DURATION";
    monthOnlyStorageMode: "OVERRIDE" | "BOUNDED_SOURCE";
    effectiveTo: string;
    allocationMode: "ADJUST_EXISTING" | "NEW_BUCKET";
    newBucketName: string;
    newBucketColor: string;
  };
  onAddDraftChange: (next: {
    label: string;
    amount: string;
    effectiveFrom: string;
    incomeTiming: "MONTH_ONLY" | "RECURRING" | "DURATION";
    monthOnlyStorageMode: "OVERRIDE" | "BOUNDED_SOURCE";
    effectiveTo: string;
    allocationMode: "ADJUST_EXISTING" | "NEW_BUCKET";
    newBucketName: string;
    newBucketColor: string;
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
        incomeTiming: addDraft.incomeTiming,
        monthOnlyStorageMode:
          addDraft.incomeTiming === "MONTH_ONLY" ? addDraft.monthOnlyStorageMode : undefined,
        effectiveTo: addDraft.incomeTiming === "DURATION" ? addDraft.effectiveTo : undefined,
        allocationDirective:
          addDraft.allocationMode === "NEW_BUCKET"
            ? {
                mode: "NEW_BUCKET",
                bucketName: addDraft.newBucketName,
                bucketColor: addDraft.newBucketColor,
              }
            : { mode: "ADJUST_EXISTING" },
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
      allocationMode: "ADJUST_EXISTING",
      newBucketName: "",
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
          <input
            type="month"
            value={addDraft.effectiveFrom}
            onChange={(e) =>
              onAddDraftChange({
                ...addDraft,
                effectiveFrom: e.target.value,
                effectiveTo: addDraft.incomeTiming === "DURATION" ? e.target.value : addDraft.effectiveTo,
              })
            }
            className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-44"
          />
          <select
            value={addDraft.incomeTiming}
            onChange={(e) =>
              onAddDraftChange({
                ...addDraft,
                incomeTiming: e.target.value as "MONTH_ONLY" | "RECURRING" | "DURATION",
              })
            }
            className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-44"
          >
            <option value="RECURRING">Recurring</option>
            <option value="MONTH_ONLY">This month only</option>
            <option value="DURATION">Fixed duration</option>
          </select>
          {addDraft.incomeTiming === "MONTH_ONLY" ? (
            <select
              value={addDraft.monthOnlyStorageMode}
              onChange={(e) =>
                onAddDraftChange({
                  ...addDraft,
                  monthOnlyStorageMode: e.target.value as "OVERRIDE" | "BOUNDED_SOURCE",
                })
              }
              className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-48"
            >
              <option value="OVERRIDE">Save as month override</option>
              <option value="BOUNDED_SOURCE">Save as one-month source</option>
            </select>
          ) : null}
          {addDraft.incomeTiming === "DURATION" ? (
            <input
              type="month"
              value={addDraft.effectiveTo}
              onChange={(e) => onAddDraftChange({ ...addDraft, effectiveTo: e.target.value })}
              className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-44"
            />
          ) : null}
          <select
            value={addDraft.allocationMode}
            onChange={(e) =>
              onAddDraftChange({
                ...addDraft,
                allocationMode: e.target.value as "ADJUST_EXISTING" | "NEW_BUCKET",
              })
            }
            className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-52"
          >
            <option value="ADJUST_EXISTING">Adjust existing buckets</option>
            <option value="NEW_BUCKET">Create new bucket for this income</option>
          </select>
          {addDraft.allocationMode === "NEW_BUCKET" ? (
            <>
              <input
                value={addDraft.newBucketName}
                onChange={(e) =>
                  onAddDraftChange({ ...addDraft, newBucketName: e.target.value })
                }
                placeholder="New bucket name"
                className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-48"
              />
              <input
                value={addDraft.newBucketColor}
                onChange={(e) =>
                  onAddDraftChange({ ...addDraft, newBucketColor: e.target.value })
                }
                placeholder="#7C63FD"
                className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm uppercase outline-none focus:border-accent sm:w-32"
              />
            </>
          ) : null}
          <button
            type="submit"
            className="min-h-11 border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90"
          >
            Add
          </button>
        </div>
      </form>
    </section>
  );
}

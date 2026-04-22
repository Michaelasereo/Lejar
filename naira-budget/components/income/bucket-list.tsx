"use client";

import { toast } from "sonner";
import { BUCKET_COLORS } from "@/lib/income/constants";
import { parseAmountInput } from "@/lib/income/money";
import { BucketCard } from "@/components/income/bucket-card";
import { cn } from "@/lib/utils/cn";
import { amountToPercentage, percentageToAmount } from "@/lib/utils/currency";

interface BucketListProps {
  buckets: Array<{
    id: string;
    name: string;
    color: string;
    sortOrder: number;
    allocatedAmount: number;
    percentage: number;
    allocationPercentage: number;
    hasAllocationMismatch: boolean;
    allocations: Array<{
      id: string;
      label: string;
      amount: number;
      percentage: number;
      platform: string;
      allocationType: string;
    }>;
  }>;
  totalIncome: number;
  addDraft: { name: string; color: string; amount: string; percentage: string };
  onAddDraftChange: (next: {
    name: string;
    color: string;
    amount: string;
    percentage: string;
  }) => void;
  onRefresh: () => void;
}

export function BucketList({
  buckets,
  totalIncome,
  addDraft,
  onAddDraftChange,
  onRefresh,
}: BucketListProps) {
  function syncAddDraftFromAmount(rawValue: string) {
    const amount = parseAmountInput(rawValue);
    onAddDraftChange({
      ...addDraft,
      amount: rawValue,
      percentage: amountToPercentage(amount, totalIncome).toFixed(2),
    });
  }

  function syncAddDraftFromPercentage(rawValue: string) {
    const percentage = parseAmountInput(rawValue);
    onAddDraftChange({
      ...addDraft,
      percentage: rawValue,
      amount: String(percentageToAmount(percentage, totalIncome)),
    });
  }

  async function addBucket(e: React.FormEvent) {
    e.preventDefault();
    const name = addDraft.name.trim();
    const amt = parseAmountInput(addDraft.amount);
    const pct = parseAmountInput(addDraft.percentage);
    if (!name) {
      toast.error("Enter a bucket name.");
      return;
    }
    if (amt < 0 || pct < 0) {
      toast.error("Enter a valid amount or percentage.");
      return;
    }
    const res = await fetch("/api/buckets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        color: addDraft.color,
        allocatedAmount: amt || undefined,
        percentage: pct || undefined,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not add bucket");
      return;
    }
    toast.success("Bucket added");
    onAddDraftChange({
      name: "",
      color: BUCKET_COLORS[0] ?? "#7C63FD",
      amount: "",
      percentage: "",
    });
    onRefresh();
  }

  return (
    <section className="border border-white/10 bg-card">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs uppercase tracking-widest text-white/40">Buckets</p>
        <h3 className="mt-2 text-lg font-medium text-foreground">Where your money goes</h3>
      </div>

      <div className="divide-y divide-white/10">
        {buckets.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/45">No buckets yet.</p>
        ) : (
          buckets.map((b) => (
            <BucketCard
              key={b.id}
              id={b.id}
              name={b.name}
              color={b.color}
              allocatedAmount={b.allocatedAmount}
              percentage={b.percentage}
              allocationPercentage={b.allocationPercentage}
              hasAllocationMismatch={b.hasAllocationMismatch}
              allocations={b.allocations}
              totalIncome={totalIncome}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>

      <form onSubmit={(e) => void addBucket(e)} className="border-t border-white/10 px-4 py-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-white/35">Add bucket</p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {BUCKET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onAddDraftChange({ ...addDraft, color: c })}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-opacity",
                  addDraft.color === c ? "border-white opacity-100" : "border-transparent opacity-70 hover:opacity-100",
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <input
              value={addDraft.name}
              onChange={(e) => onAddDraftChange({ ...addDraft, name: e.target.value })}
              placeholder="Bucket name"
              className="min-h-11 min-w-[160px] flex-1 border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <input
              inputMode="decimal"
              value={addDraft.amount}
              onChange={(e) => syncAddDraftFromAmount(e.target.value)}
              placeholder="Allocated amount"
              className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-40"
            />
            <input
              inputMode="decimal"
              value={addDraft.percentage}
              onChange={(e) => syncAddDraftFromPercentage(e.target.value)}
              placeholder="Bucket %"
              className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-28"
            />
            <button
              type="submit"
              className="min-h-11 border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              Add bucket
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

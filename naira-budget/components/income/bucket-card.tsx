"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  amountToPercentage,
  formatNaira,
  percentageToAmount,
} from "@/lib/utils/currency";
import { parseAmountInput } from "@/lib/income/money";
import { AllocationForm } from "@/components/income/allocation-form";
import { cn } from "@/lib/utils/cn";

interface Allocation {
  id: string;
  label: string;
  amount: number;
  percentage: number;
  platform: string;
  allocationType: string;
}

interface BucketCardProps {
  id: string;
  name: string;
  color: string;
  allocatedAmount: number;
  percentage: number;
  allocationPercentage: number;
  hasAllocationMismatch: boolean;
  allocations: Allocation[];
  totalIncome: number;
  onRefresh: () => void;
}

function platformLabel(code: string): string {
  const map: Record<string, string> = {
    PIGGYVEST: "PiggyVest",
    COWRYWISE: "Cowrywise",
    OPAY: "OPay",
    PALMPAY: "PalmPay",
    GTB: "GTBank",
    OTHER: "Other",
  };
  return map[code] ?? code;
}

function AllocationRow({
  allocation,
  totalIncome,
  onRefresh,
}: {
  allocation: Allocation;
  totalIncome: number;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [draftLabel, setDraftLabel] = useState(allocation.label);
  const [draftPercentage, setDraftPercentage] = useState(allocation.percentage.toFixed(2));
  const [draftAmount, setDraftAmount] = useState(String(Math.round(allocation.amount)));

  async function save() {
    const pct =
      mode === "percent"
        ? parseAmountInput(draftPercentage)
        : amountToPercentage(parseAmountInput(draftAmount), totalIncome);
    if (!draftLabel.trim() || pct <= 0 || pct > 100) {
      toast.error("Enter a label and a valid percentage.");
      return;
    }
    const res = await fetch(`/api/allocations/${allocation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: draftLabel.trim(),
        percentage: pct,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not save");
      return;
    }
    toast.success("Updated");
    setEditing(false);
    onRefresh();
  }

  async function remove() {
    if (!confirm("Remove this allocation?")) return;
    const res = await fetch(`/api/allocations/${allocation.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not delete");
      return;
    }
    toast.success("Removed");
    onRefresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/5 py-2.5 text-sm last:border-b-0">
      {editing ? (
        <>
          <input
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            className="min-h-9 min-w-[100px] flex-1 border border-white/15 bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void save()}
            className="inline-flex min-h-9 min-w-9 items-center justify-center border border-accent bg-accent text-accent-foreground"
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraftLabel(allocation.label);
              setDraftPercentage(allocation.percentage.toFixed(2));
              setDraftAmount(String(Math.round(allocation.amount)));
            }}
            className="inline-flex min-h-9 min-w-9 items-center justify-center border border-white/15"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <span
            className="inline-flex max-w-[100px] items-center rounded-none border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/55"
            title={allocation.allocationType}
          >
            {platformLabel(allocation.platform)}
          </span>
          <span className="min-w-[80px] flex-1 text-foreground">{allocation.label}</span>
          {editing ? null : (
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span>{allocation.percentage.toFixed(2)}%</span>
              <span>=</span>
              <span className="tabular-nums">{formatNaira(allocation.amount)}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-8 min-w-8 items-center justify-center border border-white/10 text-white/45 hover:text-white/75"
            aria-label="Edit allocation"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            className="inline-flex min-h-8 min-w-8 items-center justify-center border border-white/10 text-white/45 hover:text-red-400"
            aria-label="Delete allocation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      {editing ? (
        <div className="mt-2 flex w-full flex-wrap items-center gap-2 pl-0 sm:pl-[110px]">
          <button
            type="button"
            onClick={() => setMode("percent")}
            className={cn(
              "border px-2 py-1 text-[10px]",
              mode === "percent" ? "border-accent text-accent" : "border-white/15 text-white/50",
            )}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setMode("amount")}
            className={cn(
              "border px-2 py-1 text-[10px]",
              mode === "amount" ? "border-accent text-accent" : "border-white/15 text-white/50",
            )}
          >
            ₦
          </button>
          {mode === "percent" ? (
            <div className="flex items-center gap-1">
              <input
                inputMode="decimal"
                value={draftPercentage}
                onChange={(e) => setDraftPercentage(e.target.value)}
                className="h-9 w-[70px] border border-white/10 bg-white/5 px-2 text-center text-sm outline-none focus:border-white/30"
              />
              <span className="text-white/40">%</span>
            </div>
          ) : (
            <input
              inputMode="decimal"
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              className="h-9 w-28 border border-white/10 bg-white/5 px-2 text-sm outline-none focus:border-white/30"
            />
          )}
          <span
            className="text-xs text-white/40"
            title={`Calculated from ${
              mode === "percent"
                ? parseAmountInput(draftPercentage).toFixed(2)
                : amountToPercentage(parseAmountInput(draftAmount), totalIncome).toFixed(2)
            }% of ${formatNaira(totalIncome)} total income`}
          >
            ={" "}
            {formatNaira(
              mode === "percent"
                ? percentageToAmount(parseAmountInput(draftPercentage), totalIncome)
                : parseAmountInput(draftAmount),
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function BucketCard({
  id,
  name,
  color,
  allocatedAmount,
  percentage,
  allocationPercentage,
  hasAllocationMismatch,
  allocations,
  totalIncome,
  onRefresh,
}: BucketCardProps) {
  const [open, setOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftAmount, setDraftAmount] = useState(String(Math.round(allocatedAmount)));
  const [draftPercentage, setDraftPercentage] = useState(percentage.toFixed(2));

  const sumAlloc = useMemo(
    () => allocations.reduce((s, a) => s + a.amount, 0),
    [allocations],
  );
  async function saveBucket() {
    const amt = parseAmountInput(draftAmount);
    const pct = parseAmountInput(draftPercentage);
    if (!draftName.trim() || amt < 0) {
      toast.error("Enter a name and a valid amount.");
      return;
    }
    const res = await fetch(`/api/buckets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draftName.trim(),
        allocatedAmount: amt,
        percentage: pct,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not save bucket");
      return;
    }
    toast.success("Bucket updated");
    setEditingBucket(false);
    onRefresh();
  }

  async function deleteBucket() {
    if (!confirm("Delete this bucket and its allocations?")) return;
    const res = await fetch(`/api/buckets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not delete");
      return;
    }
    toast.success("Bucket removed");
    onRefresh();
  }

  return (
    <div className="border border-white/10 bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="flex-1 text-sm font-medium text-foreground">{name}</span>
        <span className="text-right text-xs tabular-nums text-white/70">
          <span className="block">{percentage.toFixed(2)}%</span>
          <span className="block">{formatNaira(allocatedAmount)}</span>
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-white/35 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4">
          {editingBucket ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="min-h-10 min-w-[160px] flex-1 border border-white/15 bg-background px-3 py-2 text-sm"
              />
              <input
                inputMode="decimal"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                className="min-h-10 w-36 border border-white/15 bg-background px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-1">
                <input
                  inputMode="decimal"
                  value={draftPercentage}
                  onChange={(e) => setDraftPercentage(e.target.value)}
                  className="min-h-10 w-24 border border-white/15 bg-background px-3 py-2 text-sm"
                />
                <span className="text-xs text-white/45">%</span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => void saveBucket()}
                  className="min-h-10 border border-accent bg-accent px-3 text-sm text-accent-foreground"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBucket(false);
                    setDraftName(name);
                    setDraftAmount(String(Math.round(allocatedAmount)));
                    setDraftPercentage(percentage.toFixed(2));
                  }}
                  className="min-h-10 border border-white/15 px-3 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftName(name);
                  setDraftAmount(String(Math.round(allocatedAmount)));
                  setDraftPercentage(percentage.toFixed(2));
                  setEditingBucket(true);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 border border-white/15 px-3 text-xs uppercase tracking-wide text-white/60 hover:border-white/30"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit bucket
              </button>
              <button
                type="button"
                onClick={() => void deleteBucket()}
                className="inline-flex min-h-9 items-center gap-1.5 border border-white/15 px-3 text-xs uppercase tracking-wide text-white/45 hover:border-red-400/40 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}

          <p className="mt-3 text-xs text-white/45">
            {allocations.length > 0 ? (
              <>
                Allocations total {formatNaira(sumAlloc)}
                <span className="text-white/35">
                  {" "}
                  · {allocationPercentage.toFixed(2)}% of {percentage.toFixed(2)}%
                </span>
              </>
            ) : (
              <>No breakdown yet — bucket total is {formatNaira(allocatedAmount)}.</>
            )}
          </p>
          {hasAllocationMismatch ? (
            <p className="mt-2 inline-flex border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
              Allocation percentages do not match this bucket&apos;s official percentage.
            </p>
          ) : null}

          <div className="mt-2">
            {allocations.map((a) => {
              return (
                <AllocationRow
                  key={a.id}
                  allocation={a}
                  totalIncome={totalIncome}
                  onRefresh={onRefresh}
                />
              );
            })}
          </div>

          <AllocationForm bucketId={id} totalIncome={totalIncome} onCreated={onRefresh} />
        </div>
      )}
    </div>
  );
}

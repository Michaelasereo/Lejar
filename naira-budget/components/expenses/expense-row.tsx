"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
} from "@/lib/expenses/constants";
import type { ExpenseCategoryValue } from "@/lib/expenses/constants";
import { dateToInputValue } from "@/lib/investments/dates";
import type { ExpenseRecord } from "@/lib/expenses/get-expenses-page-data";
import { parseAmountInput } from "@/lib/income/money";
import { formatNaira } from "@/lib/utils/currency";

interface ExpenseRowProps {
  row: ExpenseRecord;
  buckets: Array<{ id: string; name: string; color: string; remaining: number }>;
  onSaved: () => void;
}

function isKnownCategory(v: string): v is ExpenseCategoryValue {
  return EXPENSE_CATEGORIES.some((c) => c.value === v);
}

export function ExpenseRow({ row, buckets, onSaved }: ExpenseRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftCategory, setDraftCategory] = useState<ExpenseCategoryValue>(
    isKnownCategory(row.category) ? row.category : "OTHER",
  );
  const [draftLabel, setDraftLabel] = useState(row.label ?? "");
  const [draftAmount, setDraftAmount] = useState(String(Math.round(row.amount)));
  const [draftBucketId, setDraftBucketId] = useState(row.bucketId ?? buckets[0]?.id ?? "");
  const [draftOccurredAt, setDraftOccurredAt] = useState(dateToInputValue(row.occurredAt));
  const [insufficientModal, setInsufficientModal] = useState<{
    bucketName: string;
    shortfall: number;
  } | null>(null);

  function startEdit() {
    setDraftCategory(isKnownCategory(row.category) ? row.category : "OTHER");
    setDraftLabel(row.label ?? "");
    setDraftAmount(String(Math.round(row.amount)));
    setDraftBucketId(row.bucketId ?? buckets[0]?.id ?? "");
    setDraftOccurredAt(dateToInputValue(row.occurredAt));
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
  }

  async function save() {
    const amt = parseAmountInput(draftAmount);
    if (amt <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }
    if (!draftBucketId) {
      toast.error("Select a bucket.");
      return;
    }

    const res = await fetch(`/api/expenses/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        category: draftCategory,
        label: draftLabel.trim() === "" ? null : draftLabel.trim(),
        bucketId: draftBucketId,
        occurredAt: draftOccurredAt,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not save");
      return;
    }
    const payload = (await res.json().catch(() => ({}))) as {
      bucketBalance?: {
        insufficientBucketBalance?: boolean;
        bucketName?: string;
        shortfall?: number;
      } | null;
    };
    if (payload.bucketBalance?.insufficientBucketBalance) {
      setInsufficientModal({
        bucketName: payload.bucketBalance.bucketName ?? "this bucket",
        shortfall: payload.bucketBalance.shortfall ?? 0,
      });
    }
    toast.success("Updated");
    setEditing(false);
    onSaved();
  }

  async function remove() {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not delete");
      return;
    }
    toast.success("Removed");
    onSaved();
  }

  return (
    <div className="border-b border-white/5 py-3 last:border-b-0">
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Category
            <select
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value as ExpenseCategoryValue)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45 sm:col-span-2 lg:col-span-2">
            Note
            <input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Amount
            <input
              inputMode="decimal"
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Date
            <input
              type="date"
              value={draftOccurredAt}
              onChange={(e) => setDraftOccurredAt(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Bucket
            <select
              value={draftBucketId}
              onChange={(e) => setDraftBucketId(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            >
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({formatNaira(Math.max(0, b.remaining))} left)
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1 sm:col-span-2 lg:col-span-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={buckets.length === 0}
              className="inline-flex min-h-10 items-center gap-1 border border-accent bg-accent px-3 text-sm text-accent-foreground"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              className="inline-flex min-h-10 items-center gap-1 border border-white/15 px-3 text-sm"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
                {expenseCategoryLabel(row.category)}
              </span>
              {row.bucketName && (
                <span
                  className="inline-flex items-center gap-1.5 border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60"
                  title={row.bucketName}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: row.bucketColor ?? "#64748b" }}
                    aria-hidden
                  />
                  {row.bucketName}
                </span>
              )}
            </div>
            {row.label ? (
              <p className="mt-1 text-foreground">{row.label}</p>
            ) : (
              <p className="mt-1 text-sm text-white/35">No note</p>
            )}
            <p className="mt-1 text-sm tabular-nums text-white/80">{formatNaira(row.amount)}</p>
            <p className="mt-1 text-xs text-white/40">{formatExpenseDate(row.occurredAt)}</p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-white/50 hover:text-white/80"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="inline-flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-white/50 hover:text-red-400"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {insufficientModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md border border-white/10 bg-card p-4">
            <h3 className="text-base font-semibold text-foreground">
              Oops, this bucket is low-key tapped out.
            </h3>
            <p className="mt-2 text-sm text-white/75">
              You&apos;re short by {formatNaira(insufficientModal.shortfall)} in{" "}
              {insufficientModal.bucketName}. Expense is logged, but this bucket can&apos;t fully
              fund it right now.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-white/60">
              <li>Add a new income source + rebalance this month.</li>
              <li>Or choose delayed gratification and park this spend for later.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setInsufficientModal(null);
                  router.push("/app/income");
                }}
                className="min-h-10 border border-accent bg-accent px-3 text-sm text-accent-foreground"
              >
                Go to Income & buckets
              </button>
              <button
                type="button"
                onClick={() => setInsufficientModal(null)}
                className="min-h-10 border border-white/15 px-3 text-sm text-white/70"
              >
                Got it, I&apos;ll rebalance
              </button>
              <button
                type="button"
                onClick={() => setInsufficientModal(null)}
                className="min-h-10 border border-white/15 px-3 text-sm text-white/70"
              >
                Noted - I&apos;ll delay it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatExpenseDate(d: Date): string {
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

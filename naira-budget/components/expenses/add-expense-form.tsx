"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/constants";
import type { ExpenseCategoryValue } from "@/lib/expenses/constants";
import { defaultOccurrenceDateForMonth } from "@/lib/expenses/default-occurrence";
import { parseAmountInput } from "@/lib/income/money";
import { createExpenseSchema } from "@/lib/validations/expense";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/currency";
import { LoadingButton } from "@/components/ui/LoadingButton";

interface AddExpenseFormProps {
  monthKey: string;
  buckets: Array<{ id: string; name: string; color: string; remaining: number }>;
  onCreated: () => void;
}

export function AddExpenseForm({ monthKey, buckets, onCreated }: AddExpenseFormProps) {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategoryValue>("OTHER");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [bucketId, setBucketId] = useState<string>(buckets[0]?.id ?? "");
  const [occurredAt, setOccurredAt] = useState(() => defaultOccurrenceDateForMonth(monthKey));
  const [submitting, setSubmitting] = useState(false);
  const [insufficientModal, setInsufficientModal] = useState<{
    bucketName: string;
    shortfall: number;
  } | null>(null);

  useEffect(() => {
    setOccurredAt(defaultOccurrenceDateForMonth(monthKey));
  }, [monthKey]);

  useEffect(() => {
    if (!bucketId && buckets[0]?.id) {
      setBucketId(buckets[0].id);
    }
  }, [bucketId, buckets]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      amount: parseAmountInput(amount),
      category,
      label: label.trim() === "" ? undefined : label.trim(),
      bucketId,
      occurredAt,
    };

    const parsed = createExpenseSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const msg =
        flat.fieldErrors.amount?.[0] ??
        flat.fieldErrors.occurredAt?.[0] ??
        flat.fieldErrors.category?.[0] ??
        "Check your entries";
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not add expense");
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
      toast.success("Expense logged");
      setLabel("");
      setAmount("");
      setBucketId(buckets[0]?.id ?? "");
      setCategory("OTHER");
      setOccurredAt(defaultOccurrenceDateForMonth(monthKey));
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="border border-dashed border-white/15 bg-background/40 p-4"
    >
      <p className="mb-3 text-xs uppercase tracking-widest text-white/35">Log expense</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategoryValue)}
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-white/50 sm:col-span-2 lg:col-span-2">
          Note (optional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Lunch at Bukka"
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Amount (₦)
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Date
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Bucket
          <select
            value={bucketId}
            onChange={(e) => setBucketId(e.target.value)}
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({formatNaira(Math.max(0, b.remaining))} left)
              </option>
            ))}
          </select>
        </label>
      </div>
      {buckets.length === 0 && (
        <p className="mt-2 text-[11px] text-amber-400/90">
          Add buckets under Income & buckets to tag spending against a budget jar.
        </p>
      )}
      <LoadingButton
        type="submit"
        state={submitting ? "loading" : "idle"}
        loadingText="Logging..."
        successText="Logged"
        size="lg"
        disabled={buckets.length === 0}
        className={cn("mt-4 w-full sm:w-auto")}
      >
        Add expense
      </LoadingButton>
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
    </form>
  );
}

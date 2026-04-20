"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/constants";
import type { ExpenseCategoryValue } from "@/lib/expenses/constants";
import { defaultOccurrenceDateForMonth } from "@/lib/expenses/default-occurrence";
import { parseAmountInput } from "@/lib/income/money";
import { createExpenseSchema } from "@/lib/validations/expense";
import { cn } from "@/lib/utils/cn";

interface AddExpenseFormProps {
  monthKey: string;
  buckets: Array<{ id: string; name: string; color: string }>;
  onCreated: () => void;
}

export function AddExpenseForm({ monthKey, buckets, onCreated }: AddExpenseFormProps) {
  const [category, setCategory] = useState<ExpenseCategoryValue>("OTHER");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [bucketId, setBucketId] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState(() => defaultOccurrenceDateForMonth(monthKey));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setOccurredAt(defaultOccurrenceDateForMonth(monthKey));
  }, [monthKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      amount: parseAmountInput(amount),
      category,
      label: label.trim() === "" ? undefined : label.trim(),
      bucketId: bucketId === "" ? null : bucketId,
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
      toast.success("Expense logged");
      setLabel("");
      setAmount("");
      setBucketId("");
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
          Bucket (optional)
          <select
            value={bucketId}
            onChange={(e) => setBucketId(e.target.value)}
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— None —</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
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
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          "mt-4 min-h-11 border border-accent bg-accent px-6 text-sm font-medium text-accent-foreground",
          "hover:bg-accent/90 disabled:opacity-50",
        )}
      >
        {submitting ? "Saving…" : "Add expense"}
      </button>
    </form>
  );
}

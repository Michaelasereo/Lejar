"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddGroceryItemForm } from "@/components/grocery/add-grocery-item-form";
import { GroceryItemRow } from "@/components/grocery/grocery-item-row";
import type { GroceryPageData } from "@/lib/grocery/get-grocery-page-data";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/constants";
import type { ExpenseCategoryValue } from "@/lib/expenses/constants";
import { formatNaira } from "@/lib/utils/currency";

interface GroceryClientProps {
  data: GroceryPageData;
}

export function GroceryClient({ data }: GroceryClientProps) {
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [category, setCategory] = useState<ExpenseCategoryValue>("FOOD");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("Grocery run");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    router.refresh();
  }

  const pending = data.items.filter((i) => !i.isPurchased).length;
  const done = data.items.filter((i) => i.isPurchased).length;
  const reviewItems = data.items.filter((item) => item.isPurchased && item.estimatedPrice !== null);
  const selectableIds = reviewItems.filter((item) => !item.movedToExpenses).map((item) => item.id);
  const selectedItems = useMemo(
    () => reviewItems.filter((item) => selectedIds.includes(item.id)),
    [reviewItems, selectedIds],
  );
  const selectedTotal = selectedItems.reduce((sum, item) => sum + (item.estimatedPrice ?? 0), 0);

  function openReview() {
    setSelectedIds(selectableIds);
    setReviewOpen(true);
  }

  async function logSelected() {
    if (selectedIds.length === 0 || selectedTotal <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/grocery/log-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedIds,
          category,
          date,
          label: label.trim() || "Grocery run",
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not log selected items");
        return;
      }
      toast.success(`${formatNaira(selectedTotal)} logged to ${category.toLowerCase()} expenses`);
      setReviewOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-white/30">Grocery</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Shopping list</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Build your run, add prices when you know them, and tick items off as you shop. Totals only
          include priced items still on your list.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Est. cart (left to buy)</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-accent">
            {formatNaira(data.pricedTotal)}
          </p>
        </div>
        <div className="border border-white/10 bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Priced lines</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-foreground">{data.pricedCount}</p>
        </div>
        <div className="border border-white/10 bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Deferred price</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-amber-400/90">{data.deferredCount}</p>
        </div>
      </div>

      {data.deferredCount > 0 && (
        <p className="text-sm text-amber-400/85">
          {data.deferredCount} item{data.deferredCount === 1 ? "" : "s"} without a price — add an
          estimate when you know it.
        </p>
      )}

      {data.checkedPricedCount > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={openReview}
            className="min-h-11 border border-accent/50 bg-accent/10 px-4 text-sm text-accent"
          >
            Review items to log ({data.checkedPricedCount} items · {formatNaira(data.checkedPricedTotal)})
          </button>
          {data.checkedNoPriceCount > 0 && (
            <p className="text-xs text-white/35">
              {data.checkedNoPriceCount} ticked items have no price - add prices to include them
            </p>
          )}
        </div>
      )}

      <AddGroceryItemForm onCreated={refresh} />

      <section className="border border-white/10 bg-card">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">Your list</p>
            <h2 className="mt-1 text-lg font-medium text-foreground">Items</h2>
          </div>
          <p className="text-xs text-white/45">
            {pending} open · {done} done · {data.loggedCount} logged to expenses
          </p>
        </div>
        <div className="px-4">
          {data.items.length === 0 ? (
            <p className="py-10 text-sm text-white/45">
              Nothing here yet. Add staples or market picks above.
            </p>
          ) : (
            data.items.map((row) => <GroceryItemRow key={row.id} row={row} onSaved={refresh} />)
          )}
        </div>
      </section>

      {reviewOpen && (
        <section className="border border-white/10 bg-card p-4">
          <h3 className="text-base font-medium text-foreground">Log to expenses</h3>
          <p className="mt-1 text-sm text-white/50">
            Select which checked items to log. Uncheck any you do not want to add.
          </p>
          <div className="mt-4 space-y-2">
            {reviewItems.length === 0 ? (
              <p className="text-sm text-white/45">No checked, priced items to log.</p>
            ) : (
              reviewItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      disabled={item.movedToExpenses}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, item.id]);
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                        }
                      }}
                    />
                    <span className={item.movedToExpenses ? "text-white/35" : "text-white"}>
                      {item.label}
                      {item.quantity ? (
                        <span className="ml-2 text-xs text-white/40">{item.quantity}</span>
                      ) : null}
                    </span>
                    {item.movedToExpenses && (
                      <span className="border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">
                        Already logged
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-white">
                    {formatNaira(item.estimatedPrice ?? 0)}
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="mt-3 text-sm text-white/70">
            Selected: {selectedItems.length} items · {formatNaira(selectedTotal)}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-white/50">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategoryValue)}
                className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/50">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/50">
              Label
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/50">
              Note
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void logSelected()}
              disabled={submitting || selectedIds.length === 0 || selectedTotal <= 0}
              className="min-h-11 border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {submitting ? "Logging..." : `Log ${formatNaira(selectedTotal)} to expenses`}
            </button>
            <button
              type="button"
              onClick={() => setReviewOpen(false)}
              className="min-h-11 border border-white/15 px-4 text-sm text-white/70"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { AddGroceryItemForm } from "@/components/grocery/add-grocery-item-form";
import { GroceryItemRow } from "@/components/grocery/grocery-item-row";
import type { GroceryPageData } from "@/lib/grocery/get-grocery-page-data";
import { formatNaira } from "@/lib/utils/currency";

interface GroceryClientProps {
  data: GroceryPageData;
}

export function GroceryClient({ data }: GroceryClientProps) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  const pending = data.items.filter((i) => !i.isPurchased).length;
  const done = data.items.filter((i) => i.isPurchased).length;

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

      <AddGroceryItemForm onCreated={refresh} />

      <section className="border border-white/10 bg-card">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">Your list</p>
            <h2 className="mt-1 text-lg font-medium text-foreground">Items</h2>
          </div>
          <p className="text-xs text-white/45">
            {pending} open · {done} done
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
    </div>
  );
}

"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { GroceryItemRecord } from "@/lib/grocery/get-grocery-page-data";
import { parseAmountInput } from "@/lib/income/money";
import { formatNaira } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

interface GroceryItemRowProps {
  row: GroceryItemRecord;
  onSaved: () => void;
}

export function GroceryItemRow({ row, onSaved }: GroceryItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(row.label);
  const [draftQty, setDraftQty] = useState(row.quantity ?? "");
  const [draftPrice, setDraftPrice] = useState(
    row.estimatedPrice === null ? "" : String(Math.round(row.estimatedPrice)),
  );

  async function togglePurchased() {
    const res = await fetch(`/api/grocery/items/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPurchased: !row.isPurchased }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not update");
      return;
    }
    onSaved();
  }

  async function save() {
    const priceTrim = draftPrice.trim();
    let estimatedPrice: number | null | undefined = undefined;
    if (priceTrim === "") {
      estimatedPrice = null;
    } else {
      const n = parseAmountInput(priceTrim);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Enter a valid price or clear the field.");
        return;
      }
      estimatedPrice = n;
    }

    const res = await fetch(`/api/grocery/items/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: draftLabel.trim(),
        quantity: draftQty.trim() === "" ? null : draftQty.trim(),
        estimatedPrice,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not save");
      return;
    }
    toast.success("Updated");
    setEditing(false);
    onSaved();
  }

  async function remove() {
    if (!confirm("Remove this item?")) return;
    const res = await fetch(`/api/grocery/items/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not delete");
      return;
    }
    toast.success("Removed");
    onSaved();
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-white/5 py-3 last:border-b-0 sm:flex-row sm:items-start",
        row.isPurchased && "opacity-55",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => void togglePurchased()}
          className={cn(
            "mt-0.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center border text-sm transition-colors",
            row.isPurchased
              ? "border-accent bg-accent/20 text-accent"
              : "border-white/15 bg-background hover:border-white/30",
          )}
          aria-checked={row.isPurchased}
          role="checkbox"
          aria-label={row.isPurchased ? "Mark not purchased" : "Mark purchased"}
        >
          {row.isPurchased ? "✓" : ""}
        </button>

        {editing ? (
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            <input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm sm:col-span-3"
            />
            <input
              value={draftQty}
              onChange={(e) => setDraftQty(e.target.value)}
              placeholder="Qty"
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
            <input
              inputMode="decimal"
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.target.value)}
              placeholder="Est. ₦"
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
            <div className="flex gap-1 sm:col-span-3">
              <button
                type="button"
                onClick={() => void save()}
                className="inline-flex min-h-10 items-center gap-1 border border-accent bg-accent px-3 text-sm text-accent-foreground"
              >
                <Check className="h-4 w-4" />
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraftLabel(row.label);
                  setDraftQty(row.quantity ?? "");
                  setDraftPrice(row.estimatedPrice === null ? "" : String(Math.round(row.estimatedPrice)));
                }}
                className="inline-flex min-h-10 items-center gap-1 border border-white/15 px-3 text-sm"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium text-foreground", row.isPurchased && "line-through")}>
              {row.label}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/55">
              {row.quantity ? (
                <span className="border border-white/10 px-2 py-0.5 text-xs">{row.quantity}</span>
              ) : null}
              {row.estimatedPrice !== null ? (
                <span className="tabular-nums text-white/75">{formatNaira(row.estimatedPrice)}</span>
              ) : (
                <span className="text-amber-400/90">Price later</span>
              )}
            </div>
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex gap-1 sm:ml-auto">
          <button
            type="button"
            onClick={() => {
              setDraftLabel(row.label);
              setDraftQty(row.quantity ?? "");
              setDraftPrice(row.estimatedPrice === null ? "" : String(Math.round(row.estimatedPrice)));
              setEditing(true);
            }}
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
      )}
    </div>
  );
}

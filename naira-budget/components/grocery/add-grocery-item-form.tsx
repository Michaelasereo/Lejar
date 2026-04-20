"use client";

import { useState } from "react";
import { toast } from "sonner";
import { parseAmountInput } from "@/lib/income/money";
import { createGroceryItemSchema } from "@/lib/validations/grocery";

interface AddGroceryItemFormProps {
  onCreated: () => void;
}

export function AddGroceryItemForm({ onCreated }: AddGroceryItemFormProps) {
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceTrim = priceInput.trim();
    let estimatedPrice: number | undefined;
    if (priceTrim !== "") {
      const n = parseAmountInput(priceTrim);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Enter a valid price or leave it blank.");
        return;
      }
      estimatedPrice = n;
    }

    const parsed = createGroceryItemSchema.safeParse({
      label: label.trim(),
      quantity: quantity.trim() === "" ? undefined : quantity.trim(),
      estimatedPrice,
    });

    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.label?.[0] ?? "Check your entries";
      toast.error(msg);
      return;
    }

    const body: Record<string, unknown> = { label: parsed.data.label };
    if (parsed.data.quantity) body.quantity = parsed.data.quantity;
    if (parsed.data.estimatedPrice !== undefined) {
      body.estimatedPrice = parsed.data.estimatedPrice;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/grocery/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not add item");
        return;
      }
      toast.success("Added to list");
      setLabel("");
      setQuantity("");
      setPriceInput("");
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
      <p className="mb-3 text-xs uppercase tracking-widest text-white/35">Add item</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Item name"
          className="min-h-11 min-w-[200px] flex-1 border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty (e.g. 2kg)"
          className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-36"
        />
        <input
          inputMode="decimal"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="Est. ₦ (optional)"
          className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-40"
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 border border-accent bg-accent px-6 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-white/35">
        Leave price empty to decide later — we still total what you have priced.
      </p>
    </form>
  );
}

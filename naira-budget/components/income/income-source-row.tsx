"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatNaira } from "@/lib/utils/currency";
import { parseAmountInput } from "@/lib/income/money";
import { cn } from "@/lib/utils/cn";

interface IncomeSourceRowProps {
  id: string;
  label: string;
  amountMonthly: number;
  onSaved: () => void;
}

export function IncomeSourceRow({
  id,
  label,
  amountMonthly,
  onSaved,
}: IncomeSourceRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);
  const [draftAmount, setDraftAmount] = useState(String(Math.round(amountMonthly)));

  function startEdit() {
    setDraftLabel(label);
    setDraftAmount(String(Math.round(amountMonthly)));
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setDraftLabel(label);
    setDraftAmount(String(Math.round(amountMonthly)));
  }

  async function save() {
    const amt = parseAmountInput(draftAmount);
    if (!draftLabel.trim() || amt <= 0) {
      toast.error("Enter a label and a positive amount.");
      return;
    }
    const res = await fetch(`/api/income/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: draftLabel.trim(),
        amountMonthly: amt,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not save");
      return;
    }
    toast.success("Income updated");
    setEditing(false);
    onSaved();
  }

  async function remove() {
    if (!confirm("Remove this income source?")) return;
    const res = await fetch(`/api/income/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not delete");
      return;
    }
    toast.success("Removed");
    onSaved();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/5 py-3 last:border-b-0">
      {editing ? (
        <>
          <input
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            className="min-h-10 min-w-[140px] flex-1 border border-white/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            aria-label="Income label"
          />
          <input
            inputMode="decimal"
            value={draftAmount}
            onChange={(e) => setDraftAmount(e.target.value)}
            className="min-h-10 w-32 border border-white/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            aria-label="Amount monthly"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void save()}
              className="inline-flex min-h-10 min-w-10 items-center justify-center border border-accent bg-accent text-accent-foreground hover:bg-accent/90"
              aria-label="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={cancel}
              className="inline-flex min-h-10 min-w-10 items-center justify-center border border-white/15 text-white/70 hover:border-white/30"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="min-w-[120px] flex-1 text-sm text-foreground">{label}</span>
          <span className="text-sm tabular-nums text-white/80">{formatNaira(amountMonthly)}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={startEdit}
              className={cn(
                "inline-flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-white/50 hover:border-white/25 hover:text-white/80",
              )}
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="inline-flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-white/50 hover:border-red-400/50 hover:text-red-400"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

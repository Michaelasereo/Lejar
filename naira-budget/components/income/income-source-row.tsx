"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatNaira } from "@/lib/utils/currency";
import { parseAmountInput } from "@/lib/income/money";
import { cn } from "@/lib/utils/cn";

interface IncomeSourceRowProps {
  id: string;
  label: string;
  amountMonthly: number;
  onSaved: () => void;
  onIncomeChanged?: () => void;
}

export function IncomeSourceRow({
  id,
  label,
  amountMonthly,
  onSaved,
  onIncomeChanged,
}: IncomeSourceRowProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);
  const [draftAmount, setDraftAmount] = useState(String(Math.round(amountMonthly)));
  const [showEffectivePrompt, setShowEffectivePrompt] = useState(false);
  const [effectiveMode, setEffectiveMode] = useState<"this" | "earlier" | "next">("this");
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const [customMonth, setCustomMonth] = useState(thisMonth);
  const [backdateNotice, setBackdateNotice] = useState<string | null>(null);

  function startEdit() {
    setDraftLabel(label);
    setDraftAmount(String(Math.round(amountMonthly)));
    setShowEffectivePrompt(false);
    setBackdateNotice(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setDraftLabel(label);
    setDraftAmount(String(Math.round(amountMonthly)));
    setShowEffectivePrompt(false);
    setBackdateNotice(null);
  }

  async function save() {
    if (saving) return;
    const amt = parseAmountInput(draftAmount);
    if (!draftLabel.trim() || amt <= 0) {
      toast.error("Enter a label and a positive amount.");
      return;
    }
    const labelChanged = draftLabel.trim() !== label;
    const amountChanged = Math.round(amt * 100) !== Math.round(amountMonthly * 100);
    if (amountChanged && !showEffectivePrompt) {
      setShowEffectivePrompt(true);
      return;
    }

    let effectiveMonth: string | undefined;
    let isBackdate = false;
    if (amountChanged) {
      effectiveMonth =
        effectiveMode === "this"
          ? thisMonth
          : effectiveMode === "next"
            ? nextMonth
            : customMonth;
      isBackdate = effectiveMode === "earlier";
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/income/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(labelChanged ? { label: draftLabel.trim() } : {}),
          ...(amountChanged ? { amountMonthly: amt, effectiveMonth, isBackdate } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not save");
        return;
      }
      const payload = (await res.json().catch(() => ({}))) as {
        allocationsRecalculated?: boolean;
        affectedMonths?: string[];
      };
      toast.success("Income updated");
      if (payload.affectedMonths && payload.affectedMonths.length > 0) {
        setBackdateNotice(
          `Income updated from ${effectiveMonth}. ${payload.affectedMonths.length} past month(s) may show different totals in analytics. Your data has been flagged for review.`,
        );
      } else {
        setBackdateNotice(null);
      }
      if (payload.allocationsRecalculated) {
        toast.success("Income updated — bucket allocations recalculated automatically");
      }
      setEditing(false);
      if (amountChanged) onIncomeChanged?.();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (deleting) return;
    if (!confirm("Remove this income source?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/income/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not delete");
        return;
      }
      const payload = (await res.json().catch(() => ({}))) as {
        allocationsRecalculated?: boolean;
      };
      toast.success("Removed");
      if (payload.allocationsRecalculated) {
        toast.success("Income updated — bucket allocations recalculated automatically");
      }
      onIncomeChanged?.();
      onSaved();
    } finally {
      setDeleting(false);
    }
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
              disabled={saving}
              className="inline-flex min-h-10 min-w-10 items-center justify-center border border-accent bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
              aria-label="Save"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="inline-flex min-h-10 min-w-10 items-center justify-center border border-white/15 text-white/70 hover:border-white/30 disabled:opacity-60"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {showEffectivePrompt ? (
            <div className="mt-2 w-full overflow-hidden border border-white/8 bg-white/[0.03] p-4 transition-all">
              <p className="text-sm text-white/75">When did this change take effect?</p>
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="radio"
                    checked={effectiveMode === "this"}
                    onChange={() => setEffectiveMode("this")}
                  />
                  This month ({thisMonth})
                </label>
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="radio"
                    checked={effectiveMode === "earlier"}
                    onChange={() => setEffectiveMode("earlier")}
                  />
                  Earlier - pick a month
                </label>
                {effectiveMode === "earlier" ? (
                  <input
                    type="month"
                    value={customMonth}
                    max={thisMonth}
                    onChange={(e) => setCustomMonth(e.target.value)}
                    className="min-h-10 border border-white/10 bg-black px-3 text-sm text-foreground"
                  />
                ) : null}
                <label className="flex items-center gap-2 text-white/70">
                  <input
                    type="radio"
                    checked={effectiveMode === "next"}
                    onChange={() => setEffectiveMode("next")}
                  />
                  Next month ({nextMonth})
                </label>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEffectivePrompt(false);
                    setDraftAmount(String(Math.round(amountMonthly)));
                  }}
                  className="min-h-10 border border-white/15 px-3 text-xs text-white/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  className="min-h-10 border border-accent bg-accent px-3 text-xs text-accent-foreground"
                >
                  Confirm change
                </button>
              </div>
            </div>
          ) : null}
          {backdateNotice ? (
            <div className="mt-2 w-full bg-amber-500/20 px-3 py-2 text-xs text-white/70">
              {backdateNotice}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <span className="min-w-[120px] flex-1 text-sm text-foreground">{label}</span>
          <span className="text-sm tabular-nums text-white/80">{formatNaira(amountMonthly)}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={startEdit}
              disabled={deleting}
              className={cn(
                "inline-flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-white/50 hover:border-white/25 hover:text-white/80 disabled:opacity-50",
              )}
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={deleting}
              className="inline-flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-white/50 hover:border-red-400/50 hover:text-red-400 disabled:opacity-50"
              aria-label={deleting ? "Deleting" : "Delete"}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

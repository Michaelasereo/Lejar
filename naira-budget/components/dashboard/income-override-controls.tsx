"use client";

import { useState } from "react";
import { toast } from "sonner";

interface IncomeOverrideControlsProps {
  monthKey: string;
  currentIncome: number;
  isOverridden: boolean;
}

export function IncomeOverrideControls({
  monthKey,
  currentIncome,
  isOverridden,
}: IncomeOverrideControlsProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.round(currentIncome)));
  const [saving, setSaving] = useState(false);

  async function saveOverride() {
    setSaving(true);
    try {
      const res = await fetch("/api/income/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthKey,
          amount: Number(amount) || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(typeof body.error === "string" ? body.error : "Could not save override");
        return;
      }
      toast.success("Income override saved");
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride() {
    setSaving(true);
    try {
      const res = await fetch(`/api/income/overrides/${monthKey}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(typeof body.error === "string" ? body.error : "Could not clear override");
        return;
      }
      toast.success("Income override cleared");
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {isOverridden ? (
        <span className="inline-flex border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent">
          Overridden
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border border-white/20 px-2 py-1 text-[11px] uppercase tracking-wide text-white/70 hover:text-white"
      >
        {open ? "Close" : "Override income"}
      </button>
      {isOverridden ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void clearOverride()}
          className="border border-red-400/40 px-2 py-1 text-[11px] uppercase tracking-wide text-red-300 disabled:opacity-40"
        >
          Clear
        </button>
      ) : null}
      {open ? (
        <div className="flex w-full items-center gap-2">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 w-36 border border-white/15 bg-background px-2 text-xs"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveOverride()}
            className="h-9 border border-accent bg-accent px-3 text-xs text-accent-foreground disabled:opacity-40"
          >
            Save month override
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  amountToPercentage,
  formatNaira,
  percentageToAmount,
} from "@/lib/utils/currency";
import {
  ALLOCATION_PLATFORMS,
  ALLOCATION_TYPES,
} from "@/lib/income/constants";
import { parseAmountInput } from "@/lib/income/money";
import { cn } from "@/lib/utils/cn";

interface AllocationFormProps {
  bucketId: string;
  totalIncome: number;
  onCreated: () => void;
}

export function AllocationForm({ bucketId, totalIncome, onCreated }: AllocationFormProps) {
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [percentage, setPercentage] = useState("");
  const [amount, setAmount] = useState("");
  const [platform, setPlatform] = useState<(typeof ALLOCATION_PLATFORMS)[number]["value"]>(
    "OTHER",
  );
  const [allocationType, setAllocationType] = useState<
    (typeof ALLOCATION_TYPES)[number]["value"]
  >("SPENDING");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pct =
      mode === "percent"
        ? parseAmountInput(percentage)
        : amountToPercentage(parseAmountInput(amount), totalIncome);
    if (!label.trim() || pct <= 0 || pct > 100) {
      toast.error("Enter a label and a valid percentage.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/buckets/${bucketId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          percentage: pct,
          platform,
          allocationType,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not add allocation");
        return;
      }
      toast.success("Allocation added");
      setLabel("");
      setPercentage("");
      setAmount("");
      setPlatform("OTHER");
      setAllocationType("SPENDING");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  const derivedAmount =
    mode === "percent"
      ? percentageToAmount(parseAmountInput(percentage), totalIncome)
      : parseAmountInput(amount);
  const displayPct =
    mode === "percent" ? parseAmountInput(percentage) : amountToPercentage(derivedAmount, totalIncome);

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-3 border border-dashed border-white/15 bg-background/40 p-3"
    >
      <p className="mb-2 text-xs uppercase tracking-widest text-white/35">New allocation</p>
      <div className="flex flex-col gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="min-h-10 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("percent")}
            className={cn(
              "min-h-10 border px-3 text-xs",
              mode === "percent" ? "border-accent text-accent" : "border-white/15 text-white/50",
            )}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setMode("amount")}
            className={cn(
              "min-h-10 border px-3 text-xs",
              mode === "amount" ? "border-accent text-accent" : "border-white/15 text-white/50",
            )}
          >
            ₦
          </button>
          {mode === "percent" ? (
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="25"
                className="min-h-10 w-[70px] border border-white/10 bg-white/5 px-2 text-center text-sm outline-none focus:border-white/30"
              />
              <span className="text-sm text-white/40">%</span>
            </div>
          ) : (
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="200000"
              className="min-h-10 w-32 border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/30"
            />
          )}
          <span
            className="text-xs text-white/40"
            title={`Calculated from ${displayPct.toFixed(2)}% of ${formatNaira(totalIncome)} total income`}
          >
            = {formatNaira(derivedAmount)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALLOCATION_PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlatform(p.value)}
              className={cn(
                "rounded-none border px-2 py-1 text-[11px] uppercase tracking-wide",
                platform === p.value
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-white/10 text-white/50 hover:border-white/25",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALLOCATION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setAllocationType(t.value)}
              className={cn(
                "rounded-none border px-2 py-1 text-[11px] uppercase tracking-wide",
                allocationType === t.value
                  ? "border-white/35 bg-white/10 text-foreground"
                  : "border-white/10 text-white/45 hover:border-white/25",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={submitting || totalIncome <= 0}
          className="min-h-10 border border-accent bg-accent text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add allocation
        </button>
      </div>
    </form>
  );
}

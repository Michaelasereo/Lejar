"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ALLOCATION_PLATFORMS,
  ALLOCATION_TYPES,
} from "@/lib/income/constants";
import { parseAmountInput } from "@/lib/income/money";
import { cn } from "@/lib/utils/cn";

interface AllocationFormProps {
  bucketId: string;
  /** Max amount this allocation can take (remaining cap inside bucket). */
  maxAmount: number;
  onCreated: () => void;
}

export function AllocationForm({ bucketId, maxAmount, onCreated }: AllocationFormProps) {
  const [label, setLabel] = useState("");
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
    const amt = parseAmountInput(amount);
    if (!label.trim() || amt <= 0) {
      toast.error("Enter a label and a positive amount.");
      return;
    }
    if (amt > maxAmount + 1e-9) {
      toast.error("Amount exceeds what’s left in this bucket.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/buckets/${bucketId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          amount: amt,
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
      setAmount("");
      setPlatform("OTHER");
      setAllocationType("SPENDING");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

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
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Max ${maxAmount.toLocaleString("en-NG")}`}
          className="min-h-10 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
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
          disabled={submitting || maxAmount <= 0}
          className="min-h-10 border border-accent bg-accent text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add allocation
        </button>
      </div>
    </form>
  );
}

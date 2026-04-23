"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  INVESTMENT_TYPES,
  investmentTypeLabel,
} from "@/lib/investments/constants";
import { dateToInputValue } from "@/lib/investments/dates";
import { parseAmountInput } from "@/lib/income/money";
import { createInvestmentSchema } from "@/lib/validations/investment";
import type { InvestmentTypeValue } from "@/lib/investments/constants";
import { cn } from "@/lib/utils/cn";
import { calculateTBillReturn } from "@/lib/utils/tbills";
import { LoadingButton } from "@/components/ui/LoadingButton";

interface AddInvestmentFormProps {
  onCreated: () => void;
}

export function AddInvestmentForm({ onCreated }: AddInvestmentFormProps) {
  const [type, setType] = useState<InvestmentTypeValue>("OTHER");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [investedAt, setInvestedAt] = useState(() => dateToInputValue(new Date()));
  const [maturityDate, setMaturityDate] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [expectedProfit, setExpectedProfit] = useState("");
  const [editingExpectedProfit, setEditingExpectedProfit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (type !== "T_BILL" || editingExpectedProfit) return;
    const principal = parseAmountInput(amount);
    const rate = parseAmountInput(annualRate);
    const start = investedAt ? new Date(investedAt) : null;
    const end = maturityDate ? new Date(maturityDate) : null;
    if (!start || !end || end <= start) return;
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const estimate = calculateTBillReturn(principal, rate, days);
    setExpectedProfit(String(Math.round(estimate)));
  }, [type, editingExpectedProfit, amount, annualRate, investedAt, maturityDate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      type,
      label: label.trim(),
      amount: parseAmountInput(amount),
      investedAt,
      maturityDate: maturityDate.trim() === "" ? null : maturityDate,
      expectedProfit:
        expectedProfit.trim() === "" ? null : parseAmountInput(expectedProfit),
      status: "ACTIVE" as const,
    };

    const parsed = createInvestmentSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        first.maturityDate?.[0] ??
        first.amount?.[0] ??
        first.label?.[0] ??
        first.investedAt?.[0] ??
        "Check your entries";
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not add investment");
        return;
      }
      toast.success("Investment added");
      setLabel("");
      setAmount("");
      setMaturityDate("");
      setAnnualRate("");
      setExpectedProfit("");
      setEditingExpectedProfit(false);
      setInvestedAt(dateToInputValue(new Date()));
      setType("OTHER");
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
      <p className="mb-3 text-xs uppercase tracking-widest text-white/35">Add investment</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as InvestmentTypeValue)}
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            {INVESTMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-white/50 sm:col-span-2 lg:col-span-2">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. FGN 364-day"
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
          Invested on
          <input
            type="date"
            value={investedAt}
            onChange={(e) => setInvestedAt(e.target.value)}
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label
          className={cn(
            "flex flex-col gap-1.5 text-xs text-white/50",
            type === "T_BILL" && "ring-1 ring-accent/30",
          )}
        >
          Maturity {type === "T_BILL" ? "(required)" : "(optional)"}
          <input
            type="date"
            value={maturityDate}
            onChange={(e) => setMaturityDate(e.target.value)}
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        {type === "T_BILL" && (
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Interest rate (% p.a.)
            <input
              inputMode="decimal"
              value={annualRate}
              onChange={(e) => {
                const next = e.target.value;
                setAnnualRate(next);
                if (!editingExpectedProfit) {
                  const principal = parseAmountInput(amount);
                  const rate = parseAmountInput(next);
                  const start = investedAt ? new Date(investedAt) : null;
                  const end = maturityDate ? new Date(maturityDate) : null;
                  if (start && end && end > start) {
                    const days = Math.ceil(
                      (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
                    );
                    const estimate = calculateTBillReturn(principal, rate, days);
                    setExpectedProfit(String(Math.round(estimate)));
                  }
                }
              }}
              placeholder="e.g. 21"
              className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Expected profit (₦)
          <input
            inputMode="decimal"
            value={expectedProfit}
            readOnly={type === "T_BILL" && !editingExpectedProfit}
            onChange={(e) => setExpectedProfit(e.target.value)}
            placeholder="Optional"
            className="min-h-11 border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-70"
          />
          <span className="text-[11px] text-white/35">
            Enter the profit you expect on maturity. This will not count in totals until
            confirmed.
          </span>
          {type === "T_BILL" && (
            <button
              type="button"
              onClick={() => setEditingExpectedProfit((prev) => !prev)}
              className="w-fit text-[11px] text-accent hover:text-accent/80"
            >
              {editingExpectedProfit ? "Use auto-calculation" : "Edit manually"}
            </button>
          )}
        </label>
      </div>
      <p className="mt-2 text-[11px] text-white/35">
        {investmentTypeLabel(type)}
        {type === "T_BILL" ? " — include maturity so we can remind you before it lands." : ""}
      </p>
      <LoadingButton
        type="submit"
        state={submitting ? "loading" : "idle"}
        loadingText="Saving..."
        successText="Investment logged"
        className="mt-4"
      >
        Add investment
      </LoadingButton>
    </form>
  );
}

"use client";

import { useState } from "react";
import type { InvestmentStatus } from "@prisma/client";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  INVESTMENT_STATUSES,
  INVESTMENT_TYPES,
  investmentStatusLabel,
  investmentTypeLabel,
} from "@/lib/investments/constants";
import type { InvestmentTypeValue } from "@/lib/investments/constants";
import { dateToInputValue } from "@/lib/investments/dates";
import { parseAmountInput } from "@/lib/income/money";
import { formatNaira } from "@/lib/utils/currency";
import type { InvestmentRecord } from "@/lib/investments/get-investments-page-data";
import { cn } from "@/lib/utils/cn";
import { daysSinceMaturity, shouldShowProfitConfirmation } from "@/lib/utils/tbills";
import { IconAction } from "@/components/ui/IconAction";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";

interface InvestmentRowProps {
  row: InvestmentRecord;
  onSaved: () => void;
}

export function InvestmentRow({ row, onSaved }: InvestmentRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState<InvestmentTypeValue>(row.type as InvestmentTypeValue);
  const [draftLabel, setDraftLabel] = useState(row.label);
  const [draftAmount, setDraftAmount] = useState(String(Math.round(row.amount)));
  const [draftInvestedAt, setDraftInvestedAt] = useState(dateToInputValue(row.investedAt));
  const [draftMaturity, setDraftMaturity] = useState(
    row.maturityDate ? dateToInputValue(row.maturityDate) : "",
  );
  const [draftStatus, setDraftStatus] = useState(row.status);
  const [actualProfit, setActualProfit] = useState(
    String(Math.round(row.expectedProfit ?? row.actualProfit ?? 0)),
  );
  const [confirmNotes, setConfirmNotes] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  function startEdit() {
    setDraftType(row.type as InvestmentTypeValue);
    setDraftLabel(row.label);
    setDraftAmount(String(Math.round(row.amount)));
    setDraftInvestedAt(dateToInputValue(row.investedAt));
    setDraftMaturity(row.maturityDate ? dateToInputValue(row.maturityDate) : "");
    setDraftStatus(row.status);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
  }

  async function save() {
    const amt = parseAmountInput(draftAmount);
    if (!draftLabel.trim() || amt <= 0) {
      toast.error("Enter a label and a positive amount.");
      return;
    }
    const maturityPayload =
      draftMaturity.trim() === "" ? null : draftMaturity.trim();
    if (draftType === "T_BILL" && !maturityPayload) {
      toast.error("T-Bills need a maturity date.");
      return;
    }

    const res = await fetch(`/api/investments/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: draftType,
        label: draftLabel.trim(),
        amount: amt,
        investedAt: draftInvestedAt,
        maturityDate: maturityPayload,
        status: draftStatus,
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
    const res = await fetch(`/api/investments/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not delete");
      return;
    }
    toast.success("Removed");
    setDeleteModalOpen(false);
    onSaved();
  }

  async function confirmProfit() {
    const profit = parseAmountInput(actualProfit);
    const res = await fetch(`/api/investments/${row.id}/confirm-profit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualProfit: profit,
        notes: confirmNotes.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not confirm profit");
      return;
    }
    toast.success(`${formatNaira(profit)} profit confirmed and added to your portfolio`);
    onSaved();
  }

  return (
    <div className="border-b border-white/5 py-3 last:border-b-0">
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Type
            <select
              value={draftType}
              onChange={(e) => setDraftType(e.target.value as InvestmentTypeValue)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            >
              {INVESTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45 sm:col-span-2 lg:col-span-2">
            Label
            <input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Amount
            <input
              inputMode="decimal"
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Invested
            <input
              type="date"
              value={draftInvestedAt}
              onChange={(e) => setDraftInvestedAt(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Maturity
            <input
              type="date"
              value={draftMaturity}
              onChange={(e) => setDraftMaturity(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/45">
            Status
            <select
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
              className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
            >
              {INVESTMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1 sm:col-span-2 lg:col-span-3">
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
              onClick={cancel}
              className="inline-flex min-h-10 items-center gap-1 border border-white/15 px-3 text-sm"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55"
                title={row.type}
              >
                {investmentTypeLabel(row.type)}
              </span>
              <span
                className={cn(
                  "inline-flex border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                  row.status === "ACTIVE"
                    ? "border-accent/40 text-accent"
                    : "border-white/15 text-white/45",
                )}
              >
                {investmentStatusLabel(row.status)}
              </span>
            </div>
            <p className="mt-1 font-medium text-foreground">{row.label}</p>
            <p className="mt-1 text-sm tabular-nums text-white/70">{formatNaira(row.amount)}</p>
            {row.expectedProfit !== null && (
              <div className="mt-1">
                <p className="text-[10px] uppercase tracking-wide text-white/30">Expected return</p>
                <p className="text-xs tabular-nums text-white/40">
                  Expected profit: {formatNaira(row.expectedProfit)}
                </p>
              </div>
            )}
            {row.actualProfit !== null && (
              <p className="mt-1 text-xs tabular-nums text-accent">
                Actual profit confirmed: {formatNaira(row.actualProfit)}
              </p>
            )}
            <p className="mt-1 text-xs text-white/40">
              Invested {dateToInputValue(row.investedAt)}
              {row.maturityDate ? ` · Matures ${dateToInputValue(row.maturityDate)}` : ""}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-white/50 hover:text-white/80"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-white/50 hover:text-red-400"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {row.maturityDate &&
        shouldShowProfitConfirmation(row.maturityDate, row.status as InvestmentStatus) && (
        <div className="mt-3 border-t border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-100/90">
            Matured {Math.max(0, daysSinceMaturity(row.maturityDate))} days ago - confirm your actual
            profit
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-white/50">
              Actual profit received (₦)
              <input
                inputMode="decimal"
                value={actualProfit}
                onChange={(e) => setActualProfit(e.target.value)}
                className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/50">
              Notes
              <input
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Optional"
                className="min-h-10 border border-white/15 bg-background px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <IconAction
              onClick={confirmProfit}
              icon={
                <span className="inline-flex min-h-10 items-center gap-1 border border-accent bg-accent px-3 text-xs font-medium text-accent-foreground">
                  Confirm & add to portfolio
                </span>
              }
              successIcon={
                <span className="inline-flex min-h-10 items-center gap-1 border border-accent/60 bg-accent/20 px-3 text-xs font-medium text-accent">
                  Confirmed
                </span>
              }
            />
            <button
              type="button"
              className="min-h-10 border border-white/15 px-3 text-xs text-white/70"
              onClick={startEdit}
            >
              Roll over instead
            </button>
          </div>
        </div>
      )}
      <ConfirmActionModal
        open={deleteModalOpen}
        title="Remove this investment?"
        description="This investment record will be deleted permanently."
        confirmLabel="Remove investment"
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

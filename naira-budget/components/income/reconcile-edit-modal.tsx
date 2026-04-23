"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PercentageStepper } from "@/components/ui/PercentageStepper";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { BUCKET_COLORS } from "@/lib/income/constants";
import { cn } from "@/lib/utils/cn";
import {
  amountToPercentage,
  formatNaira,
  percentageToAmount,
} from "@/lib/utils/currency";

const PERCENTAGE_TOLERANCE = 0.01;

interface BucketReconcileItem {
  id: string;
  name: string;
  color: string;
  percentage: number;
  allocationPercentage: number;
}

type ReconcileScope = "permanent" | "monthly";
type InputMode = "percentage" | "amount";

interface ReconcileEditModalProps {
  open: boolean;
  totalIncome: number;
  buckets: BucketReconcileItem[];
  editedBucketId?: string;
  decimalStep?: number;
  decimalPrecision?: number;
  lockEditedBucket?: boolean;
  scope?: ReconcileScope;
  monthKey?: string;
  title?: string;
  subtitleHint?: string;
  onClose: () => void;
  onApplied: () => void | Promise<void>;
}

type UnderMode = "distribute" | "new_bucket";

function isPercentageClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= PERCENTAGE_TOLERANCE;
}

function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

export function ReconcileEditModal({
  open,
  totalIncome,
  buckets,
  editedBucketId,
  decimalStep = 0.01,
  decimalPrecision = 2,
  lockEditedBucket = true,
  scope = "permanent",
  monthKey,
  title,
  subtitleHint,
  onClose,
  onApplied,
}: ReconcileEditModalProps) {
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [underMode, setUnderMode] = useState<UnderMode>("distribute");
  const [newBucketName, setNewBucketName] = useState("");
  const [newBucketColor, setNewBucketColor] = useState<string>(
    BUCKET_COLORS[0] ?? "#7C63FD",
  );
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("percentage");

  const editedBucket = useMemo(
    () => (editedBucketId ? buckets.find((bucket) => bucket.id === editedBucketId) ?? null : null),
    [buckets, editedBucketId],
  );

  useEffect(() => {
    if (!open) return;
    setDrafts(
      Object.fromEntries(
        buckets.map((bucket) => [bucket.id, Number(bucket.percentage.toFixed(decimalPrecision))]),
      ),
    );
    setUnderMode("distribute");
    setNewBucketName("");
    setNewBucketColor(BUCKET_COLORS[0] ?? "#7C63FD");
    setSaving(false);
    setErrorText("");
    setInputMode("percentage");
  }, [open, buckets, decimalPrecision]);

  const totalDraftPercentage = useMemo(
    () => Object.values(drafts).reduce((sum, value) => sum + value, 0),
    [drafts],
  );
  const remainingPercentage = Number((100 - totalDraftPercentage).toFixed(decimalPrecision));
  const isOver = remainingPercentage < -PERCENTAGE_TOLERANCE;
  const isUnder = remainingPercentage > PERCENTAGE_TOLERANCE;
  const isBalanced = !isOver && !isUnder;

  const totalDraftAmount = useMemo(
    () =>
      Object.values(drafts).reduce(
        (sum, value) => sum + percentageToAmount(value, totalIncome),
        0,
      ),
    [drafts, totalIncome],
  );
  const remainingAmount = Math.round(totalIncome - totalDraftAmount);

  const allocationMismatch =
    editedBucket &&
    editedBucket.allocationPercentage > 0 &&
    !isPercentageClose(
      drafts[editedBucket.id] ?? roundPercentage(editedBucket.percentage),
      editedBucket.allocationPercentage,
    );

  const canSaveDistribute = isBalanced && !allocationMismatch;
  const canSaveWithNewBucket = isUnder && !allocationMismatch && newBucketName.trim().length > 0;

  function adjustDraftPercentage(bucketId: string, value: number) {
    setDrafts((prev) => ({
      ...prev,
      [bucketId]: Number(Math.max(0, Math.min(100, value)).toFixed(decimalPrecision)),
    }));
  }

  function adjustDraftFromAmount(bucketId: string, rawAmount: string) {
    const amount = Number(rawAmount) || 0;
    const pct = amountToPercentage(amount, totalIncome);
    adjustDraftPercentage(bucketId, pct);
  }

  async function applyChanges() {
    if (saving) return;
    const useNewBucket = underMode === "new_bucket" && isUnder;
    if (!canSaveDistribute && !useNewBucket) return;
    if (useNewBucket && !canSaveWithNewBucket) return;
    setSaving(true);
    setErrorText("");
    try {
      if (scope === "monthly") {
        if (!monthKey) throw new Error("Month is required for monthly reconcile");
        const updates = buckets.map((bucket) => {
          const pct = Number(
            (drafts[bucket.id] ?? bucket.percentage).toFixed(decimalPrecision),
          );
          return {
            bucketId: bucket.id,
            percentage: pct,
            allocatedAmount: percentageToAmount(pct, totalIncome),
          };
        });
        const body: {
          monthKey: string;
          updates: typeof updates;
          newBucket?: {
            name: string;
            color: string;
            percentage: number;
            allocatedAmount: number;
          };
        } = { monthKey, updates };
        if (useNewBucket) {
          body.newBucket = {
            name: newBucketName.trim(),
            color: newBucketColor,
            percentage: remainingPercentage,
            allocatedAmount: percentageToAmount(remainingPercentage, totalIncome),
          };
        }
        const res = await fetch("/api/buckets/monthly-override", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : "Could not save monthly overrides",
          );
        }
      } else {
        const updates = buckets.map((bucket) => ({
          id: bucket.id,
          percentage: Number(
            (drafts[bucket.id] ?? bucket.percentage).toFixed(decimalPrecision),
          ),
        }));
        const updateRes = await fetch("/api/buckets/batch-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates,
            expectedTotalPercentage: useNewBucket
              ? Number((100 - remainingPercentage).toFixed(decimalPrecision))
              : 100,
          }),
        });
        if (!updateRes.ok) {
          const payload = await updateRes.json().catch(() => ({}));
          throw new Error(
            typeof payload.error === "string" ? payload.error : "Could not rebalance buckets",
          );
        }

        if (useNewBucket) {
          const createRes = await fetch("/api/buckets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newBucketName.trim(),
              color: newBucketColor,
              percentage: remainingPercentage,
              allocatedAmount: Math.round((remainingPercentage / 100) * totalIncome),
            }),
          });
          if (!createRes.ok) {
            const payload = await createRes.json().catch(() => ({}));
            throw new Error(
              typeof payload.error === "string" ? payload.error : "Could not create bucket",
            );
          }
        }
      }

      toast.success(scope === "monthly" ? "Month rebalanced" : "Buckets balanced");
      await Promise.resolve(onApplied());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save";
      setErrorText(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const effectiveTitle =
    title ?? (scope === "monthly" ? "Rebalance this month" : "Balance your buckets");
  const statusText = isOver
    ? inputMode === "percentage"
      ? `Over by ${Math.abs(remainingPercentage).toFixed(decimalPrecision)}%`
      : `Over by ${formatNaira(Math.abs(remainingAmount))}`
    : isUnder
      ? inputMode === "percentage"
        ? `${remainingPercentage.toFixed(decimalPrecision)}% unallocated`
        : `${formatNaira(remainingAmount)} unallocated`
      : "All allocations are balanced";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-white/10 bg-card">
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h3 className="text-base font-medium text-white">{effectiveTitle}</h3>
            <p className="mt-1 text-xs text-white/55">
              {scope === "monthly"
                ? `Applies to ${monthKey ?? "this month"} only. For a permanent split, edit from Settings.`
                : subtitleHint ?? "Changes apply to your ongoing budget."}
            </p>
            <p className="mt-1 text-xs text-white/55">{statusText}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center border border-white/10 text-white/50 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="inline-flex border border-white/15 bg-background/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setInputMode("percentage")}
              className={cn(
                "min-h-8 px-3",
                inputMode === "percentage"
                  ? "bg-accent text-accent-foreground"
                  : "text-white/65",
              )}
            >
              Percentage
            </button>
            <button
              type="button"
              onClick={() => setInputMode("amount")}
              className={cn(
                "min-h-8 px-3",
                inputMode === "amount"
                  ? "bg-accent text-accent-foreground"
                  : "text-white/65",
              )}
            >
              Amount
            </button>
          </div>
          <p className="text-xs text-white/40">
            Total income for this month: {formatNaira(totalIncome)}
          </p>
        </div>

        {isUnder ? (
          <div className="border-b border-white/10 px-4 py-3">
            <div className="inline-flex border border-white/10 p-1 text-xs">
              <button
                type="button"
                onClick={() => setUnderMode("distribute")}
                className={cn(
                  "px-3 py-1",
                  underMode === "distribute"
                    ? "bg-accent text-accent-foreground"
                    : "text-white/60",
                )}
              >
                Distribute manually
              </button>
              <button
                type="button"
                onClick={() => setUnderMode("new_bucket")}
                className={cn(
                  "px-3 py-1",
                  underMode === "new_bucket"
                    ? "bg-accent text-accent-foreground"
                    : "text-white/60",
                )}
              >
                Create new bucket
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex-1 space-y-2 overflow-auto px-4 py-3">
          {buckets.map((bucket) => {
            const value = drafts[bucket.id] ?? Number(bucket.percentage.toFixed(decimalPrecision));
            const amountValue = percentageToAmount(value, totalIncome);
            const bucketIsEdited =
              lockEditedBucket && editedBucketId ? bucket.id === editedBucketId : false;
            return (
              <div
                key={bucket.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/10 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm text-white/75">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span>{bucket.name}</span>
                  {bucket.id === editedBucketId ? (
                    <span className="text-[11px] uppercase tracking-wide text-accent">Edited</span>
                  ) : null}
                </div>
                {bucketIsEdited ? (
                  <span className="text-right text-sm font-medium text-white">
                    {inputMode === "percentage"
                      ? `${value.toFixed(decimalPrecision)}%`
                      : formatNaira(amountValue)}
                  </span>
                ) : inputMode === "percentage" ? (
                  <div className="flex items-center gap-3">
                    <PercentageStepper
                      value={value}
                      originalValue={bucket.percentage}
                      onChange={(next) => adjustDraftPercentage(bucket.id, next)}
                      min={0}
                      max={100}
                      step={decimalStep}
                      precision={decimalPrecision}
                      allowInput
                    />
                    <span className="hidden min-w-[80px] text-right text-xs tabular-nums text-white/40 sm:inline">
                      = {formatNaira(amountValue)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">₦</span>
                    <input
                      inputMode="decimal"
                      value={String(amountValue)}
                      onChange={(event) =>
                        adjustDraftFromAmount(bucket.id, event.target.value)
                      }
                      className="h-8 w-32 border border-white/15 bg-background px-2 text-right text-sm outline-none focus:border-accent"
                      aria-label={`${bucket.name} amount`}
                    />
                    <span className="min-w-[56px] text-right text-xs tabular-nums text-white/40">
                      {value.toFixed(decimalPrecision)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {underMode === "new_bucket" && isUnder ? (
            <div className="border border-white/10 p-3">
              <p className="text-xs text-white/55">
                New bucket will get {remainingPercentage.toFixed(decimalPrecision)}% (
                {formatNaira(percentageToAmount(remainingPercentage, totalIncome))})
              </p>
              <label className="mt-2 block">
                <span className="mb-1 block text-xs text-white/45">New bucket name</span>
                <input
                  value={newBucketName}
                  onChange={(event) => setNewBucketName(event.target.value)}
                  placeholder="e.g. Misc savings"
                  className="min-h-10 w-full border border-white/15 bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {BUCKET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewBucketColor(color)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2",
                      color === newBucketColor ? "border-white" : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Choose ${color}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <p
            className={cn(
              "text-xs",
              isBalanced
                ? "text-accent"
                : isOver
                  ? "text-red-400"
                  : "text-amber-400",
            )}
          >
            Remaining:{" "}
            {inputMode === "percentage"
              ? `${remainingPercentage.toFixed(decimalPrecision)}%`
              : formatNaira(remainingAmount)}
          </p>
          {allocationMismatch && editedBucket ? (
            <p className="mt-1 text-xs text-amber-300">
              This bucket has sub-allocations totaling{" "}
              {editedBucket.allocationPercentage.toFixed(2)}%. Match this value before saving.
            </p>
          ) : null}
          {errorText ? <p className="mt-1 text-xs text-red-400">{errorText}</p> : null}
          <div className="mt-3 flex gap-2">
            <LoadingButton
              type="button"
              state={saving ? "loading" : "idle"}
              loadingText="Saving..."
              disabled={underMode === "new_bucket" && isUnder ? !canSaveWithNewBucket : !canSaveDistribute}
              onClick={() => void applyChanges()}
            >
              {scope === "monthly" ? "Save for this month" : "Save changes"}
            </LoadingButton>
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 border border-white/15 px-3 text-sm text-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

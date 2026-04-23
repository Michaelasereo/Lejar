"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PercentageStepper } from "@/components/ui/PercentageStepper";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { BUCKET_COLORS } from "@/lib/income/constants";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/currency";

const PERCENTAGE_TOLERANCE = 0.01;

interface BucketReconcileItem {
  id: string;
  name: string;
  color: string;
  percentage: number;
  allocationPercentage: number;
}

interface ReconcileEditModalProps {
  open: boolean;
  totalIncome: number;
  buckets: BucketReconcileItem[];
  editedBucketId: string;
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

  const editedBucket = useMemo(
    () => buckets.find((bucket) => bucket.id === editedBucketId) ?? null,
    [buckets, editedBucketId],
  );

  useEffect(() => {
    if (!open) return;
    setDrafts(
      Object.fromEntries(
        buckets.map((bucket) => [bucket.id, roundPercentage(bucket.percentage)]),
      ),
    );
    setUnderMode("distribute");
    setNewBucketName("");
    setNewBucketColor(BUCKET_COLORS[0] ?? "#7C63FD");
    setSaving(false);
    setErrorText("");
  }, [open, buckets]);

  const totalDraftPercentage = useMemo(
    () => Object.values(drafts).reduce((sum, value) => sum + value, 0),
    [drafts],
  );
  const remainingPercentage = roundPercentage(100 - totalDraftPercentage);
  const isOver = remainingPercentage < -PERCENTAGE_TOLERANCE;
  const isUnder = remainingPercentage > PERCENTAGE_TOLERANCE;
  const isBalanced = !isOver && !isUnder;

  const allocationMismatch =
    editedBucket &&
    editedBucket.allocationPercentage > 0 &&
    !isPercentageClose(
      drafts[editedBucket.id] ?? roundPercentage(editedBucket.percentage),
      editedBucket.allocationPercentage,
    );

  const canSaveDistribute = isBalanced && !allocationMismatch;
  const canSaveWithNewBucket = isUnder && !allocationMismatch && newBucketName.trim().length > 0;

  function adjustDraft(bucketId: string, value: number) {
    setDrafts((prev) => ({
      ...prev,
      [bucketId]: Math.max(0, Math.min(100, value)),
    }));
  }

  async function applyChanges() {
    if (saving) return;
    const useNewBucket = underMode === "new_bucket" && isUnder;
    if (!canSaveDistribute && !useNewBucket) return;
    if (useNewBucket && !canSaveWithNewBucket) return;
    setSaving(true);
    setErrorText("");
    try {
      const updates = buckets.map((bucket) => ({
        id: bucket.id,
        percentage: roundPercentage(drafts[bucket.id] ?? bucket.percentage),
      }));
      const updateRes = await fetch("/api/buckets/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates,
          expectedTotalPercentage: useNewBucket
            ? roundPercentage(100 - remainingPercentage)
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

      toast.success("Buckets balanced");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl border border-white/10 bg-card">
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h3 className="text-base font-medium text-white">Balance your buckets</h3>
            <p className="mt-1 text-xs text-white/55">
              {isOver
                ? `Over by ${Math.abs(remainingPercentage).toFixed(2)}%`
                : isUnder
                  ? `${remainingPercentage.toFixed(2)}% unallocated`
                  : "All percentages are balanced"}
            </p>
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

        <div className="max-h-[55vh] space-y-2 overflow-auto px-4 py-3">
          {buckets.map((bucket) => {
            const value = drafts[bucket.id] ?? roundPercentage(bucket.percentage);
            return (
              <div
                key={bucket.id}
                className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm text-white/75">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                  <span>{bucket.name}</span>
                  {bucket.id === editedBucketId ? (
                    <span className="text-[11px] uppercase tracking-wide text-accent">Edited</span>
                  ) : null}
                </div>
                {bucket.id === editedBucketId ? (
                  <span className="w-12 text-right text-sm font-medium text-white">
                    {Math.round(value)}%
                  </span>
                ) : (
                  <PercentageStepper
                    value={Math.round(value)}
                    originalValue={Math.round(bucket.percentage)}
                    onChange={(next) => adjustDraft(bucket.id, next)}
                    min={0}
                    max={100}
                  />
                )}
              </div>
            );
          })}

          {underMode === "new_bucket" && isUnder ? (
            <div className="border border-white/10 p-3">
              <p className="text-xs text-white/55">
                New bucket will get {remainingPercentage.toFixed(2)}% (
                {formatNaira(Math.round((remainingPercentage / 100) * totalIncome))})
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
            Remaining: {remainingPercentage.toFixed(2)}%
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
              Save changes
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

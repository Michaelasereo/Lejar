"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { BUCKET_COLORS } from "@/lib/income/constants";
import { parseAmountInput } from "@/lib/income/money";
import { BucketCard } from "@/components/income/bucket-card";
import { cn } from "@/lib/utils/cn";
import { amountToPercentage, percentageToAmount } from "@/lib/utils/currency";
import { PercentageStepper } from "@/components/ui/PercentageStepper";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { ReconcileEditModal } from "@/components/income/reconcile-edit-modal";

interface BucketListProps {
  buckets: Array<{
    id: string;
    name: string;
    color: string;
    sortOrder: number;
    allocatedAmount: number;
    percentage: number;
    allocationPercentage: number;
    hasAllocationMismatch: boolean;
    allocations: Array<{
      id: string;
      label: string;
      amount: number;
      percentage: number;
      platform: string;
      allocationType: string;
    }>;
  }>;
  totalIncome: number;
  monthKey: string;
  addDraft: { name: string; color: string; amount: string; percentage: string };
  onAddDraftChange: (next: {
    name: string;
    color: string;
    amount: string;
    percentage: string;
  }) => void;
  onRefresh: () => void;
}

interface BucketSaveRequest {
  id: string;
  name: string;
  color: string;
  allocatedAmount: number;
  percentage: number;
  allocationPercentage: number;
}

interface ReconcileBucketDraft {
  id: string;
  name: string;
  color: string;
  percentage: number;
  allocationPercentage: number;
}

export function BucketList({
  buckets,
  totalIncome,
  monthKey,
  addDraft,
  onAddDraftChange,
  onRefresh,
}: BucketListProps) {
  const [makeRoomOpen, setMakeRoomOpen] = useState(false);
  const [makeRoomName, setMakeRoomName] = useState("");
  const [makeRoomSaving, setMakeRoomSaving] = useState(false);
  const [addingBucket, setAddingBucket] = useState(false);
  const [makeRoomDrafts, setMakeRoomDrafts] = useState<Record<string, number>>(
    Object.fromEntries(buckets.map((bucket) => [bucket.id, Math.round(bucket.percentage)])),
  );
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileBuckets, setReconcileBuckets] = useState<ReconcileBucketDraft[]>([]);
  const [reconcileEditedBucketId, setReconcileEditedBucketId] = useState<string | null>(null);
  const [pendingEditedBucketMeta, setPendingEditedBucketMeta] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);

  const totalBucketPercentage = buckets.reduce((sum, bucket) => sum + bucket.percentage, 0);
  const fullAllocation = totalBucketPercentage >= 99.99;
  const makeRoomCurrentTotal = Object.values(makeRoomDrafts).reduce((sum, value) => sum + value, 0);
  const freedPercentage = Math.max(0, 100 - makeRoomCurrentTotal);
  const freedAmount = Math.round((freedPercentage / 100) * totalIncome);
  const changedBucketIds = buckets
    .filter((bucket) => Math.round(bucket.percentage) !== (makeRoomDrafts[bucket.id] ?? 0))
    .map((bucket) => bucket.id);

  function openMakeRoomPanel() {
    setMakeRoomDrafts(
      Object.fromEntries(buckets.map((bucket) => [bucket.id, Math.round(bucket.percentage)])),
    );
    setMakeRoomName(addDraft.name.trim());
    setMakeRoomOpen(true);
  }

  function adjustDraft(bucketId: string, nextValue: number) {
    setMakeRoomDrafts((prev) => ({ ...prev, [bucketId]: nextValue }));
  }

  async function createWithMakeRoom() {
    if (freedPercentage <= 0 || !makeRoomName.trim()) return;
    setMakeRoomSaving(true);
    try {
      const updates = changedBucketIds.map((id) => ({
        id,
        percentage: makeRoomDrafts[id] ?? 0,
      }));
      if (updates.length > 0) {
        const updateRes = await fetch("/api/buckets/batch-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates,
            expectedTotalPercentage: 100 - freedPercentage,
          }),
        });
        if (!updateRes.ok) {
          const j = await updateRes.json().catch(() => ({}));
          throw new Error(typeof j.error === "string" ? j.error : "Could not rebalance buckets");
        }
      }
      const createRes = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: makeRoomName.trim(),
          color: addDraft.color,
          percentage: freedPercentage,
          allocatedAmount: freedAmount,
        }),
      });
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        throw new Error(typeof j.error === "string" ? j.error : "Could not create bucket");
      }
      toast.success(`Bucket created with ${freedPercentage}%`);
      setMakeRoomOpen(false);
      onAddDraftChange({ name: "", color: BUCKET_COLORS[0] ?? "#7C63FD", amount: "", percentage: "" });
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create bucket");
    } finally {
      setMakeRoomSaving(false);
    }
  }

  function syncAddDraftFromAmount(rawValue: string) {
    const amount = parseAmountInput(rawValue);
    onAddDraftChange({
      ...addDraft,
      amount: rawValue,
      percentage: amountToPercentage(amount, totalIncome).toFixed(2),
    });
  }

  function syncAddDraftFromPercentage(rawValue: string) {
    const percentage = parseAmountInput(rawValue);
    onAddDraftChange({
      ...addDraft,
      percentage: rawValue,
      amount: String(percentageToAmount(percentage, totalIncome)),
    });
  }

  async function addBucket(e: React.FormEvent) {
    e.preventDefault();
    if (addingBucket) return;
    const name = addDraft.name.trim();
    const amt = parseAmountInput(addDraft.amount);
    const pct = parseAmountInput(addDraft.percentage);
    if (!name) {
      toast.error("Enter a bucket name.");
      return;
    }
    if (amt < 0 || pct < 0) {
      toast.error("Enter a valid amount or percentage.");
      return;
    }
    if (fullAllocation) {
      openMakeRoomPanel();
      return;
    }
    setAddingBucket(true);
    try {
      const res = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color: addDraft.color,
          allocatedAmount: amt || undefined,
          percentage: pct || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const errorMessage = typeof j.error === "string" ? j.error : "Could not add bucket";
        if (
          errorMessage.toLowerCase().includes("percentage") ||
          errorMessage.toLowerCase().includes("allocated")
        ) {
          openMakeRoomPanel();
          return;
        }
        toast.error(errorMessage);
        return;
      }
      toast.success("Bucket added");
      onAddDraftChange({
        name: "",
        color: BUCKET_COLORS[0] ?? "#7C63FD",
        amount: "",
        percentage: "",
      });
      onRefresh();
    } finally {
      setAddingBucket(false);
    }
  }

  async function handleBucketSaveRequest(
    payload: BucketSaveRequest,
  ): Promise<"saved" | "needs_reconcile" | "error"> {
    const originalBucket = buckets.find((bucket) => bucket.id === payload.id);
    if (!originalBucket) {
      toast.error("Bucket not found");
      return "error";
    }

    const projectedBuckets = buckets.map((bucket) => {
      if (bucket.id !== payload.id) {
        return {
          id: bucket.id,
          name: bucket.name,
          color: bucket.color,
          percentage: bucket.percentage,
          allocationPercentage: bucket.allocationPercentage,
        };
      }
      return {
        id: bucket.id,
        name: payload.name,
        color: payload.color,
        percentage: payload.percentage,
        allocationPercentage: payload.allocationPercentage,
      };
    });
    const projectedTotal = projectedBuckets.reduce((sum, bucket) => sum + bucket.percentage, 0);
    const needsReconcile = Math.abs(projectedTotal - 100) > 0.01;

    if (needsReconcile) {
      setReconcileBuckets(projectedBuckets);
      setReconcileEditedBucketId(payload.id);
      setPendingEditedBucketMeta({
        id: payload.id,
        name: payload.name,
        color: payload.color,
      });
      setReconcileOpen(true);
      return "needs_reconcile";
    }

    const metadataChanged =
      payload.name !== originalBucket.name || payload.color !== originalBucket.color;
    if (metadataChanged) {
      const detailsRes = await fetch(`/api/buckets/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          color: payload.color,
        }),
      });
      if (!detailsRes.ok) {
        const j = await detailsRes.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not save bucket details");
        return "error";
      }
    }

    const updates = buckets.map((bucket) =>
      bucket.id === payload.id
        ? {
            bucketId: bucket.id,
            percentage: payload.percentage,
            allocatedAmount: payload.allocatedAmount,
          }
        : {
            bucketId: bucket.id,
            percentage: bucket.percentage,
            allocatedAmount: bucket.allocatedAmount,
          },
    );

    const overrideRes = await fetch("/api/buckets/monthly-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthKey,
        updates,
      }),
    });
    if (!overrideRes.ok) {
      const j = await overrideRes.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not save month override");
      return "error";
    }

    return "saved";
  }

  async function handleReconcileApplied() {
    if (pendingEditedBucketMeta) {
      const res = await fetch(`/api/buckets/${pendingEditedBucketMeta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pendingEditedBucketMeta.name,
          color: pendingEditedBucketMeta.color,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === "string" ? j.error : "Could not save bucket details");
      }
    }
    setReconcileOpen(false);
    setReconcileEditedBucketId(null);
    setPendingEditedBucketMeta(null);
    setReconcileBuckets([]);
    onRefresh();
  }

  return (
    <section className="border border-white/10 bg-card">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs uppercase tracking-widest text-white/40">Buckets</p>
        <h3 className="mt-2 text-lg font-medium text-foreground">Where your money goes</h3>
      </div>

      <div className="divide-y divide-white/10">
        {buckets.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/45">No buckets yet.</p>
        ) : (
          buckets.map((b) => (
            <BucketCard
              key={b.id}
              id={b.id}
              name={b.name}
              color={b.color}
              allocatedAmount={b.allocatedAmount}
              percentage={b.percentage}
              allocationPercentage={b.allocationPercentage}
              hasAllocationMismatch={b.hasAllocationMismatch}
              allocations={b.allocations}
              totalIncome={totalIncome}
              onRefresh={onRefresh}
              onRequestSaveBucket={handleBucketSaveRequest}
            />
          ))
        )}
      </div>

      <form onSubmit={(e) => void addBucket(e)} className="border-t border-white/10 px-4 py-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-white/35">Add bucket</p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {BUCKET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onAddDraftChange({ ...addDraft, color: c })}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-opacity",
                  addDraft.color === c ? "border-white opacity-100" : "border-transparent opacity-70 hover:opacity-100",
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <input
              value={addDraft.name}
              onChange={(e) => onAddDraftChange({ ...addDraft, name: e.target.value })}
              placeholder="Bucket name"
              className="min-h-11 min-w-[160px] flex-1 border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <input
              inputMode="decimal"
              value={addDraft.amount}
              onChange={(e) => syncAddDraftFromAmount(e.target.value)}
              placeholder="Allocated amount"
              className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-40"
            />
            <input
              inputMode="decimal"
              value={addDraft.percentage}
              onChange={(e) => syncAddDraftFromPercentage(e.target.value)}
              placeholder="Bucket %"
              className="min-h-11 w-full border border-white/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent sm:w-28"
            />
            <LoadingButton
              type="submit"
              state={addingBucket ? "loading" : "idle"}
              loadingText="Adding..."
              size="md"
              className="min-h-11 px-5"
            >
              Add bucket
            </LoadingButton>
          </div>
        </div>
        <AnimatePresence>
          {makeRoomOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="mt-4 overflow-hidden border border-white/8 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Make room for a new bucket</p>
                  <p className="mt-1 mb-4 text-xs text-white/40">
                    Reduce one or more existing buckets to free up percentage for your new one.
                    Changes only apply when you confirm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMakeRoomOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center border border-white/10 text-white/45 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {buckets.map((bucket) => {
                  const originalValue = Math.round(bucket.percentage);
                  const currentValue = makeRoomDrafts[bucket.id] ?? originalValue;
                  const delta = currentValue - originalValue;
                  return (
                    <div key={bucket.id} className="flex items-center justify-between gap-3 border border-white/8 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                        {bucket.name}
                      </div>
                      <div className="flex flex-col items-end">
                        <PercentageStepper
                          value={currentValue}
                          originalValue={originalValue}
                          onChange={(next) => adjustDraft(bucket.id, next)}
                        />
                        {delta > 0 && makeRoomCurrentTotal > 100 ? (
                          <p className="text-[11px] text-amber-400">
                            Reduce another bucket by {makeRoomCurrentTotal - 100}%
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-white/40">Freed up</span>
                  <span className={cn(freedPercentage > 0 ? "text-accent" : "text-white/30")}>
                    {freedPercentage}% freed · {freedAmount.toLocaleString("en-NG")}₦ available
                  </span>
                </div>
                <div className="h-1 w-full bg-white/8">
                  <div
                    className="h-1 bg-accent transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, freedPercentage))}%` }}
                  />
                </div>
              </div>
              {freedPercentage > 0 ? (
                <label className="mt-4 block">
                  <span className="mb-1 block text-xs text-white/50">New bucket name</span>
                  <input
                    value={makeRoomName}
                    onChange={(e) => setMakeRoomName(e.target.value)}
                    placeholder="e.g. Travel fund"
                    className="min-h-10 w-full border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>
              ) : null}
              <div className="mt-4 flex gap-2">
                <LoadingButton
                  type="button"
                  state={makeRoomSaving ? "loading" : "idle"}
                  loadingText="Creating..."
                  disabled={freedPercentage <= 0 || !makeRoomName.trim()}
                  onClick={() => createWithMakeRoom()}
                >
                  Create bucket with {freedPercentage}%
                </LoadingButton>
                <button
                  type="button"
                  onClick={() => setMakeRoomOpen(false)}
                  className="min-h-10 border border-white/15 px-3 text-sm text-white/70"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </form>
      {reconcileEditedBucketId ? (
        <ReconcileEditModal
          open={reconcileOpen}
          totalIncome={totalIncome}
          buckets={reconcileBuckets}
          editedBucketId={reconcileEditedBucketId}
          scope="monthly"
          monthKey={monthKey}
          onClose={() => {
            setReconcileOpen(false);
            setReconcileEditedBucketId(null);
            setPendingEditedBucketMeta(null);
            setReconcileBuckets([]);
          }}
          onApplied={handleReconcileApplied}
        />
      ) : null}
    </section>
  );
}

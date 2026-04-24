"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { IncomePageData } from "@/lib/income/get-income-page-data";
import { BUCKET_COLORS } from "@/lib/income/constants";
import { formatMonthParam } from "@/lib/utils/dates";
import { parseAmountInput } from "@/lib/income/money";
import { BalanceIndicator } from "@/components/income/balance-indicator";
import { BucketList } from "@/components/income/bucket-list";
import { IncomeSourceList } from "@/components/income/income-source-list";
import { ReconcileEditModal } from "@/components/income/reconcile-edit-modal";

interface IncomeBucketsClientProps {
  initialData: IncomePageData;
}

interface AddIncomeDraft {
  label: string;
  amount: string;
  effectiveFrom: string;
  thisMonthOnly: boolean;
  allocationMode: "ADJUST_EXISTING" | "SINGLE_BUCKET" | "NEW_BUCKET";
  targetBucketId: string;
  newBucketName: string;
  newBucketColor: string;
}

export function IncomeBucketsClient({ initialData }: IncomeBucketsClientProps) {
  const router = useRouter();
  const currentMonth = initialData.monthKey || formatMonthParam(new Date().getFullYear(), new Date().getMonth() + 1);
  const [addIncome, setAddIncome] = useState<AddIncomeDraft>({
    label: "",
    amount: "",
    effectiveFrom: currentMonth,
    thisMonthOnly: false,
    allocationMode: "ADJUST_EXISTING",
    targetBucketId: initialData.buckets[0]?.id ?? "",
    newBucketName: "",
    newBucketColor: BUCKET_COLORS[0] ?? "#7C63FD",
  });
  const [addBucket, setAddBucket] = useState<{
    name: string;
    color: string;
    amount: string;
    percentage: string;
  }>({
    name: "",
    color: BUCKET_COLORS[0] ?? "#7C63FD",
    amount: "",
    percentage: "",
  });

  const [reconcileOpen, setReconcileOpen] = useState(false);
  const pendingReconcileRef = useRef(false);

  const dirty = useMemo(() => {
    const i = addIncome.label.trim() !== "" || addIncome.amount.trim() !== "";
    const b =
      addBucket.name.trim() !== "" ||
      addBucket.amount.trim() !== "" ||
      addBucket.percentage.trim() !== "";
    return i || b;
  }, [addIncome, addBucket]);

  const { totalIncome, totalBucketAllocated, totalAllocatedPercentage, remaining } = initialData;
  const balanced = Math.abs(totalAllocatedPercentage - 100) < 0.01;
  const amountBalanced = Math.abs(remaining) < 0.5;
  const fullyBalanced = balanced && amountBalanced;

  useEffect(() => {
    if (pendingReconcileRef.current && !fullyBalanced && initialData.buckets.length > 0) {
      pendingReconcileRef.current = false;
      setReconcileOpen(true);
    } else if (pendingReconcileRef.current && fullyBalanced) {
      pendingReconcileRef.current = false;
    }
  }, [fullyBalanced, initialData]);

  function refresh() {
    router.refresh();
  }

  function markIncomeChanged() {
    pendingReconcileRef.current = true;
  }

  const reconcileBuckets = useMemo(
    () =>
      initialData.buckets.map((bucket) => ({
        id: bucket.id,
        name: bucket.name,
        color: bucket.color,
        percentage: bucket.percentage,
        allocationPercentage: bucket.allocationPercentage,
      })),
    [initialData.buckets],
  );

  async function handleSaveAll() {
    if (!balanced || !dirty) return;
    try {
      if (addIncome.label.trim() && parseAmountInput(addIncome.amount) > 0) {
        const incomePayload: {
          label: string;
          amountMonthly: number;
          effectiveFrom?: string;
          incomeTiming: "MONTH_ONLY" | "RECURRING";
          monthOnlyStorageMode?: "BOUNDED_SOURCE";
          allocationDirective:
            | { mode: "ADJUST_EXISTING" }
            | { mode: "SINGLE_BUCKET"; bucketId: string }
            | { mode: "NEW_BUCKET"; bucketName: string; bucketColor: string };
        } = {
          label: addIncome.label.trim(),
          amountMonthly: parseAmountInput(addIncome.amount),
          incomeTiming: addIncome.thisMonthOnly ? "MONTH_ONLY" : "RECURRING",
          effectiveFrom: addIncome.effectiveFrom,
          allocationDirective: { mode: "ADJUST_EXISTING" },
        };
        if (addIncome.allocationMode === "SINGLE_BUCKET") {
          incomePayload.allocationDirective = {
            mode: "SINGLE_BUCKET",
            bucketId: addIncome.targetBucketId,
          };
        } else if (addIncome.allocationMode === "NEW_BUCKET") {
          incomePayload.allocationDirective = {
            mode: "NEW_BUCKET",
            bucketName: addIncome.newBucketName.trim(),
            bucketColor: addIncome.newBucketColor,
          };
        }
        if (addIncome.thisMonthOnly) {
          incomePayload.monthOnlyStorageMode = "BOUNDED_SOURCE";
        }
        const res = await fetch("/api/income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incomePayload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(typeof j.error === "string" ? j.error : "Could not add income");
        }
        setAddIncome({
          label: "",
          amount: "",
          effectiveFrom: currentMonth,
          thisMonthOnly: false,
          allocationMode: "ADJUST_EXISTING",
          targetBucketId: initialData.buckets[0]?.id ?? "",
          newBucketName: "",
          newBucketColor: BUCKET_COLORS[0] ?? "#7C63FD",
        });
      }
      if (
        addBucket.name.trim() &&
        (addBucket.amount.trim() !== "" || addBucket.percentage.trim() !== "")
      ) {
        const amt = parseAmountInput(addBucket.amount);
        const pct = parseAmountInput(addBucket.percentage);
        if (amt >= 0 || pct >= 0) {
          const res = await fetch("/api/buckets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: addBucket.name.trim(),
              color: addBucket.color,
              allocatedAmount: amt,
              percentage: pct,
            }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(typeof j.error === "string" ? j.error : "Could not add bucket");
          }
          setAddBucket({
            name: "",
            color: BUCKET_COLORS[0] ?? "#7C63FD",
            amount: "",
            percentage: "",
          });
        }
      }
      toast.success("Saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function handleReconcileApplied() {
    setReconcileOpen(false);
    refresh();
  }

  return (
    <div className="space-y-6 pb-28 md:pb-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-white/30">Income</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Income & buckets</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Manage monthly income and bucket allocations. Buckets can include platform splits
          (PiggyVest, OPay, etc.) without changing your total budget.
        </p>
      </header>

      <IncomeSourceList
        sources={initialData.incomeSources}
        totalIncome={totalIncome}
        addDraft={addIncome}
        onAddDraftChange={setAddIncome}
        buckets={initialData.buckets}
        onRefresh={refresh}
        onIncomeChanged={markIncomeChanged}
      />

      <BucketList
        buckets={initialData.buckets}
        totalIncome={totalIncome}
        monthKey={currentMonth}
        addDraft={addBucket}
        onAddDraftChange={setAddBucket}
        onRefresh={refresh}
      />

      {!fullyBalanced && initialData.buckets.length > 0 ? (
        <div className="border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/80">
          <p className="font-medium text-amber-200">Budget for this month is out of sync</p>
          <p className="mt-1 text-xs text-amber-200/70">
            Your buckets don&apos;t add up to your monthly income. Rebalance now to fix it for this
            month only.
          </p>
          <button
            type="button"
            onClick={() => setReconcileOpen(true)}
            className="mt-2 min-h-10 border border-amber-300/40 bg-amber-300/10 px-3 text-xs uppercase tracking-wide text-amber-100 hover:bg-amber-300/20"
          >
            Rebalance this month
          </button>
        </div>
      ) : null}

      <BalanceIndicator
        totalIncome={totalIncome}
        totalAllocated={totalBucketAllocated}
        totalAllocatedPercentage={totalAllocatedPercentage}
        remaining={remaining}
        dirty={dirty}
        canSave={balanced && dirty}
        onSave={handleSaveAll}
      />

      <ReconcileEditModal
        open={reconcileOpen}
        totalIncome={totalIncome}
        buckets={reconcileBuckets}
        scope="monthly"
        monthKey={currentMonth}
        lockEditedBucket={false}
        onClose={() => setReconcileOpen(false)}
        onApplied={handleReconcileApplied}
      />
    </div>
  );
}

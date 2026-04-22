"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { IncomePageData } from "@/lib/income/get-income-page-data";
import { BUCKET_COLORS } from "@/lib/income/constants";
import { formatMonthParam, parseMonthParam } from "@/lib/utils/dates";
import { parseAmountInput } from "@/lib/income/money";
import { BalanceIndicator } from "@/components/income/balance-indicator";
import { BucketList } from "@/components/income/bucket-list";
import { IncomeSourceList } from "@/components/income/income-source-list";

interface IncomeBucketsClientProps {
  initialData: IncomePageData;
}

interface AddIncomeDraft {
  label: string;
  amount: string;
  effectiveFrom: string;
  incomeTiming: "MONTH_ONLY" | "RECURRING" | "DURATION";
  monthOnlyStorageMode: "OVERRIDE" | "BOUNDED_SOURCE";
  effectiveTo: string;
  allocationMode: "ADJUST_EXISTING" | "NEW_BUCKET";
  newBucketName: string;
  newBucketColor: string;
}

export function IncomeBucketsClient({ initialData }: IncomeBucketsClientProps) {
  const router = useRouter();
  const currentMonth = formatMonthParam(new Date().getFullYear(), new Date().getMonth() + 1);
  const [addIncome, setAddIncome] = useState<AddIncomeDraft>({
    label: "",
    amount: "",
    effectiveFrom: currentMonth,
    incomeTiming: "RECURRING" as "MONTH_ONLY" | "RECURRING" | "DURATION",
    monthOnlyStorageMode: "OVERRIDE" as "OVERRIDE" | "BOUNDED_SOURCE",
    effectiveTo: currentMonth,
    allocationMode: "ADJUST_EXISTING" as "ADJUST_EXISTING" | "NEW_BUCKET",
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

  function refresh() {
    router.refresh();
  }

  async function handleSaveAll() {
    if (!balanced || !dirty) return;
    try {
      if (addIncome.label.trim() && parseAmountInput(addIncome.amount) > 0) {
        if (addIncome.allocationMode === "NEW_BUCKET" && !addIncome.newBucketName.trim()) {
          throw new Error("Enter a new bucket name for this income.");
        }
        const incomePayload: {
          label: string;
          amountMonthly: number;
          effectiveFrom?: string;
          incomeTiming: "MONTH_ONLY" | "RECURRING" | "DURATION";
          monthOnlyStorageMode?: "OVERRIDE" | "BOUNDED_SOURCE";
          effectiveTo?: string;
          allocationDirective:
            | { mode: "ADJUST_EXISTING" }
            | { mode: "NEW_BUCKET"; bucketName: string; bucketColor: string };
        } = {
          label: addIncome.label.trim(),
          amountMonthly: parseAmountInput(addIncome.amount),
          incomeTiming: addIncome.incomeTiming,
          effectiveFrom: addIncome.effectiveFrom,
          allocationDirective:
            addIncome.allocationMode === "NEW_BUCKET"
              ? {
                  mode: "NEW_BUCKET",
                  bucketName: addIncome.newBucketName.trim(),
                  bucketColor: addIncome.newBucketColor,
                }
              : { mode: "ADJUST_EXISTING" },
        };
        if (addIncome.incomeTiming === "MONTH_ONLY") {
          incomePayload.monthOnlyStorageMode = addIncome.monthOnlyStorageMode;
        }
        if (addIncome.incomeTiming === "DURATION") {
          const from = parseMonthParam(addIncome.effectiveFrom);
          const to = parseMonthParam(addIncome.effectiveTo);
          if (
            to.year < from.year ||
            (to.year === from.year && to.month < from.month)
          ) {
            throw new Error("Duration end month cannot be before start month.");
          }
          incomePayload.effectiveTo = addIncome.effectiveTo;
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
          incomeTiming: "RECURRING",
          monthOnlyStorageMode: "OVERRIDE",
          effectiveTo: currentMonth,
          allocationMode: "ADJUST_EXISTING",
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
        onRefresh={refresh}
      />

      <BucketList
        buckets={initialData.buckets}
        totalIncome={totalIncome}
        addDraft={addBucket}
        onAddDraftChange={setAddBucket}
        onRefresh={refresh}
      />

      <BalanceIndicator
        totalIncome={totalIncome}
        totalAllocated={totalBucketAllocated}
        totalAllocatedPercentage={totalAllocatedPercentage}
        remaining={remaining}
        dirty={dirty}
        canSave={balanced && dirty}
        onSave={handleSaveAll}
      />
    </div>
  );
}

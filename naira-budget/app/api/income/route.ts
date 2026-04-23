import { NextRequest, NextResponse } from "next/server";
import { endOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { getMonthlyBucketOverrides } from "@/lib/income/monthly-bucket-overrides";
import { recalculateAllocationAmountsForUser } from "@/lib/income/recalculate-allocation-amounts";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { formatMonthParam, getMonthsBetween, parseMonthParam } from "@/lib/utils/dates";
import { getCurrentIncome, getIncomeActiveForMonth, getIncomeForMonth } from "@/lib/utils/income";
import { createIncomeSchema } from "@/lib/validations/income-api";

function addIncomePercentage(amount: number, total: number): number {
  if (total <= 0) return 0;
  return (amount / total) * 100;
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { searchParams } = new URL(req.url);
  const month = parseMonthParam(searchParams.get("month") ?? undefined);
  const rows = await getIncomeActiveForMonth(auth.user.id, month.year, month.month);
  return NextResponse.json({
    income: rows.map((row) => ({
      id: row.id,
      label: row.label,
      amountMonthly: Number(row.amountMonthly),
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = createIncomeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    label,
    amountMonthly,
    effectiveFrom,
    effectiveTo,
    incomeTiming,
    allocationDirective,
  } = parsed.data;

  try {
    const startMonth = parseMonthParam(effectiveFrom);
    const startDate = startMonth.date;
    const startMonthKey = formatMonthParam(startMonth.year, startMonth.month);
    const endDate =
      incomeTiming === "DURATION" && effectiveTo
        ? endOfMonth(parseMonthParam(effectiveTo).date)
        : incomeTiming === "MONTH_ONLY"
          ? endOfMonth(startDate)
          : null;
    const bucketTotal = await prisma.bucket.aggregate({
      where: { userId: auth.user.id },
      _sum: { percentage: true },
    });
    const existingBucketPercentage = Number(bucketTotal._sum.percentage ?? 0);
    const currentIncome = await getCurrentIncome(auth.user.id);
    const totalIncomeBefore = currentIncome.reduce((sum, row) => sum + Number(row.amountMonthly), 0);
    const totalIncomeAfter = totalIncomeBefore + amountMonthly;
    const monthIncomeBefore = await getIncomeForMonth(auth.user.id, startMonth.year, startMonth.month);
    const monthIncomeAfter = monthIncomeBefore + amountMonthly;

    if (allocationDirective.mode === "NEW_BUCKET" && totalIncomeAfter > 0) {
      const nextBucketPercentage = (amountMonthly / totalIncomeAfter) * 100;
      if (existingBucketPercentage + nextBucketPercentage > 100 + 1e-9) {
        return NextResponse.json(
          {
            error:
              "Cannot add a new bucket for this income because bucket percentages are already fully allocated. Choose 'Adjust existing buckets' or reduce existing bucket percentages first.",
          },
          { status: 400 },
        );
      }
    }

    let createdIncomeId: string | null = null;
    let createdIncomeLabel: string | null = null;
    let createdIncomeAmountMonthly: string | null = null;

    await prisma.$transaction(async (tx) => {
      const currentBuckets = await tx.bucket.findMany({
        where: { userId: auth.user.id },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          sortOrder: true,
          percentage: true,
          allocatedAmount: true,
        },
      });
      const monthOverrideRows = await getMonthlyBucketOverrides(tx, auth.user.id, startMonthKey);
      const monthOverrideMap = new Map(
        monthOverrideRows.map((row) => [
          row.bucketId,
          {
            allocatedAmount: Number(row.allocatedAmount),
            percentage: row.percentage,
          },
        ]),
      );
      const monthlyBucketBase = currentBuckets.map((bucket) => ({
        id: bucket.id,
        allocatedAmount:
          monthOverrideMap.get(bucket.id)?.allocatedAmount ??
          Math.round(((bucket.percentage ?? 0) / 100) * monthIncomeBefore),
        percentage: monthOverrideMap.get(bucket.id)?.percentage ?? (bucket.percentage ?? 0),
      }));

      const row = await tx.incomeSource.create({
        data: {
          userId: auth.user.id,
          label,
          amountMonthly: new Prisma.Decimal(amountMonthly),
          effectiveFrom: startDate,
          effectiveTo: endDate,
          isActive: true,
        },
      });
      createdIncomeId = row.id;
      createdIncomeLabel = row.label;
      createdIncomeAmountMonthly = row.amountMonthly.toString();

      if (allocationDirective.mode === "NEW_BUCKET") {
        const nextPercentage = addIncomePercentage(amountMonthly, totalIncomeAfter);
        const maxSort = await tx.bucket.aggregate({
          where: { userId: auth.user.id },
          _max: { sortOrder: true },
        });
        const createdBucket = await tx.bucket.create({
          data: {
            userId: auth.user.id,
            name: allocationDirective.bucketName.trim(),
            color: allocationDirective.bucketColor,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            percentage: incomeTiming === "MONTH_ONLY" ? 0 : nextPercentage,
            allocatedAmount: new Prisma.Decimal(
              incomeTiming === "MONTH_ONLY"
                ? 0
                : Math.round((nextPercentage / 100) * totalIncomeAfter),
            ),
          },
        });
        if (incomeTiming === "MONTH_ONLY") {
          monthlyBucketBase.push({
            id: createdBucket.id,
            allocatedAmount: 0,
            percentage: 0,
          });
        }
      }

      if (allocationDirective.mode === "SINGLE_BUCKET" && incomeTiming !== "MONTH_ONLY") {
        const targetBucket = currentBuckets.find((bucket) => bucket.id === allocationDirective.bucketId);
        if (!targetBucket) {
          throw new Error("Selected bucket not found");
        }
        const baseByBucket = new Map(
          currentBuckets.map((bucket) => [
            bucket.id,
            Math.round(((bucket.percentage ?? 0) / 100) * totalIncomeBefore),
          ]),
        );
        baseByBucket.set(
          targetBucket.id,
          (baseByBucket.get(targetBucket.id) ?? 0) + amountMonthly,
        );
        for (const bucket of currentBuckets) {
          const nextAmount = baseByBucket.get(bucket.id) ?? 0;
          const nextPercentage = addIncomePercentage(nextAmount, totalIncomeAfter);
          await tx.bucket.update({
            where: { id: bucket.id },
            data: {
              percentage: nextPercentage,
              allocatedAmount: new Prisma.Decimal(nextAmount),
            },
          });
        }
      }

      if (incomeTiming === "MONTH_ONLY" && (allocationDirective.mode === "SINGLE_BUCKET" || allocationDirective.mode === "NEW_BUCKET")) {
        const targetBucketId =
          allocationDirective.mode === "SINGLE_BUCKET"
            ? allocationDirective.bucketId
            : monthlyBucketBase[monthlyBucketBase.length - 1]?.id;
        if (!targetBucketId) {
          throw new Error("Could not resolve target bucket for month-only routing");
        }
        const nextByBucket = new Map(
          monthlyBucketBase.map((bucket) => [bucket.id, bucket.allocatedAmount]),
        );
        if (!nextByBucket.has(targetBucketId)) {
          throw new Error("Selected bucket not found");
        }
        nextByBucket.set(targetBucketId, (nextByBucket.get(targetBucketId) ?? 0) + amountMonthly);
        const bucketIds = Array.from(nextByBucket.keys());
        await tx.monthlyBucketOverride.deleteMany({
          where: { userId: auth.user.id, monthKey: startMonthKey },
        });
        for (const bucketId of bucketIds) {
          const allocatedAmount = nextByBucket.get(bucketId) ?? 0;
          const percentage = addIncomePercentage(allocatedAmount, monthIncomeAfter);
          await tx.monthlyBucketOverride.create({
            data: {
              userId: auth.user.id,
              monthKey: startMonthKey,
              bucketId,
              allocatedAmount: new Prisma.Decimal(allocatedAmount),
              percentage,
            },
          });
        }
      }
    });

    const now = new Date();
    const monthsToRefresh = getMonthsBetween(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      now.getFullYear(),
      now.getMonth() + 1,
    );
    await refreshSnapshotsForMonths(prisma, auth.user.id, monthsToRefresh);
    const recalc = await recalculateAllocationAmountsForUser(auth.user.id);

    return NextResponse.json(
      {
        id: createdIncomeId,
        label: createdIncomeLabel ?? label,
        amountMonthly: createdIncomeAmountMonthly ?? String(amountMonthly),
        allocationsRecalculated: recalc.updatedCount > 0,
        overrideMonthKey: null,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create income source" }, { status: 500 });
  }
}

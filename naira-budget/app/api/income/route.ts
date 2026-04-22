import { NextRequest, NextResponse } from "next/server";
import { endOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { recalculateAllocationAmountsForUser } from "@/lib/income/recalculate-allocation-amounts";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { formatMonthParam, getMonthsBetween, parseMonthParam } from "@/lib/utils/dates";
import { getCurrentIncome, getIncomeActiveForMonth, getIncomeForMonth } from "@/lib/utils/income";
import { createIncomeSchema } from "@/lib/validations/income-api";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const now = new Date();
  const rows = await getIncomeActiveForMonth(auth.user.id, now.getFullYear(), now.getMonth() + 1);
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
    monthOnlyStorageMode,
    allocationDirective,
  } = parsed.data;

  try {
    const startMonth = parseMonthParam(effectiveFrom);
    const startDate = startMonth.date;
    const endDate =
      incomeTiming === "DURATION" && effectiveTo
        ? endOfMonth(parseMonthParam(effectiveTo).date)
        : incomeTiming === "MONTH_ONLY" && monthOnlyStorageMode === "BOUNDED_SOURCE"
          ? endOfMonth(startDate)
          : null;
    const shouldCreateOverride =
      incomeTiming === "MONTH_ONLY" && monthOnlyStorageMode === "OVERRIDE";
    const bucketTotal = await prisma.bucket.aggregate({
      where: { userId: auth.user.id },
      _sum: { percentage: true },
    });
    const existingBucketPercentage = Number(bucketTotal._sum.percentage ?? 0);
    const currentIncome = await getCurrentIncome(auth.user.id);
    const totalIncomeBefore = currentIncome.reduce((sum, row) => sum + Number(row.amountMonthly), 0);
    const totalIncomeAfter = totalIncomeBefore + amountMonthly;

    if (
      allocationDirective.mode === "NEW_BUCKET" &&
      !shouldCreateOverride &&
      totalIncomeAfter > 0
    ) {
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
    let overrideMonthKey: string | null = null;

    await prisma.$transaction(async (tx) => {
      if (shouldCreateOverride) {
        const monthKey = formatMonthParam(startMonth.year, startMonth.month);
        const baseline = await getIncomeForMonth(auth.user.id, startMonth.year, startMonth.month);
        await tx.monthlyIncomeOverride.upsert({
          where: { userId_monthKey: { userId: auth.user.id, monthKey } },
          update: {
            amount: new Prisma.Decimal(baseline + amountMonthly),
            note: `Includes ${label}`,
          },
          create: {
            userId: auth.user.id,
            monthKey,
            amount: new Prisma.Decimal(baseline + amountMonthly),
            note: `Includes ${label}`,
          },
        });
        overrideMonthKey = monthKey;
        return;
      }

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

      if (allocationDirective.mode === "NEW_BUCKET" && totalIncomeAfter > 0) {
        const nextPercentage = (amountMonthly / totalIncomeAfter) * 100;
        const maxSort = await tx.bucket.aggregate({
          where: { userId: auth.user.id },
          _max: { sortOrder: true },
        });
        await tx.bucket.create({
          data: {
            userId: auth.user.id,
            name: allocationDirective.bucketName.trim(),
            color: allocationDirective.bucketColor,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            percentage: nextPercentage,
            allocatedAmount: new Prisma.Decimal(Math.round((nextPercentage / 100) * totalIncomeAfter)),
          },
        });
      }
    });

    const now = new Date();
    const monthsToRefresh = overrideMonthKey
      ? [{ year: startMonth.year, month: startMonth.month }]
      : getMonthsBetween(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          now.getFullYear(),
          now.getMonth() + 1,
        );
    await refreshSnapshotsForMonths(prisma, auth.user.id, monthsToRefresh);
    const recalc = await recalculateAllocationAmountsForUser(auth.user.id);

    return NextResponse.json(
      {
        id: createdIncomeId ?? overrideMonthKey,
        label: createdIncomeLabel ?? label,
        amountMonthly: createdIncomeAmountMonthly ?? String(amountMonthly),
        allocationsRecalculated: recalc.updatedCount > 0,
        overrideMonthKey,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create income source" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { getUserBucketPercentageTotal } from "@/lib/income/bucket-percentage";
import { getTotalIncomeForUser } from "@/lib/income/recalculate-allocation-amounts";
import { amountToPercentage } from "@/lib/utils/currency";
import { prisma } from "@/lib/prisma";
import { createBucketSchema } from "@/lib/validations/income-api";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const totalIncome = await getTotalIncomeForUser(auth.user.id);
  const allocationsNeedingMigration = await prisma.bucketAllocation.findMany({
    where: {
      bucket: { userId: auth.user.id },
      percentage: null,
    },
    select: { id: true, amount: true },
  });

  if (allocationsNeedingMigration.length > 0 && totalIncome > 0) {
    await prisma.$transaction(
      allocationsNeedingMigration.map((a) =>
        prisma.bucketAllocation.update({
          where: { id: a.id },
          data: {
            percentage: amountToPercentage(Number(a.amount), totalIncome),
          },
        }),
      ),
    );
  }

  const buckets = await prisma.bucket.findMany({
    where: { userId: auth.user.id },
    orderBy: { sortOrder: "asc" },
    include: {
      allocations: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({
    buckets: buckets.map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      color: bucket.color,
      sortOrder: bucket.sortOrder,
      allocatedAmount: bucket.allocatedAmount.toString(),
      percentage:
        typeof bucket.percentage === "number"
          ? bucket.percentage
          : bucket.allocations.reduce((sum, row) => sum + (row.percentage ?? 0), 0),
      allocations: bucket.allocations.map((allocation) => ({
        id: allocation.id,
        label: allocation.label,
        amount: allocation.amount.toString(),
        percentage: allocation.percentage,
        platform: allocation.platform,
        allocationType: allocation.allocationType,
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = createBucketSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, color, allocatedAmount, percentage } = parsed.data;

  try {
    const agg = await prisma.bucket.aggregate({
      where: { userId: auth.user.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;
    const totalIncome = await getTotalIncomeForUser(auth.user.id);
    const resolvedPercentage =
      typeof percentage === "number"
        ? percentage
        : amountToPercentage(allocatedAmount ?? 0, totalIncome);
    const usedPercentage = await getUserBucketPercentageTotal(auth.user.id);
    if (usedPercentage + resolvedPercentage > 100 + 1e-9) {
      return NextResponse.json(
        { error: "Total bucket percentage cannot exceed 100%." },
        { status: 400 },
      );
    }
    const resolvedAmount =
      typeof allocatedAmount === "number"
        ? allocatedAmount
        : Math.round((resolvedPercentage / 100) * totalIncome);

    const row = await prisma.bucket.create({
      data: {
        userId: auth.user.id,
        name,
        color,
        sortOrder,
        percentage: resolvedPercentage,
        allocatedAmount: new Prisma.Decimal(resolvedAmount),
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        name: row.name,
        color: row.color,
        sortOrder: row.sortOrder,
        allocatedAmount: row.allocatedAmount.toString(),
        percentage: row.percentage,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create bucket" }, { status: 500 });
  }
}

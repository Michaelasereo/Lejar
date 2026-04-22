import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { getBucketAllocationPercentage } from "@/lib/income/bucket-percentage";
import { getTotalIncomeForUser } from "@/lib/income/recalculate-allocation-amounts";
import { amountToPercentage, percentageToAmount } from "@/lib/utils/currency";
import { prisma } from "@/lib/prisma";
import { createAllocationSchema } from "@/lib/validations/income-api";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const bucketId = context.params.id;

  const json: unknown = await req.json();
  const parsed = createAllocationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const bucket = await prisma.bucket.findFirst({
    where: { id: bucketId, userId: auth.user.id },
  });
  if (!bucket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const totalIncome = await getTotalIncomeForUser(auth.user.id);
  if (totalIncome <= 0) {
    return NextResponse.json(
      {
        error: "Add income before creating allocations.",
      },
      { status: 400 },
    );
  }

  const { label, amount, percentage, platform, allocationType } = parsed.data;
  const resolvedPercentage =
    typeof percentage === "number"
      ? percentage
      : typeof amount === "number"
        ? amountToPercentage(amount, totalIncome)
        : null;

  if (resolvedPercentage === null) {
    return NextResponse.json({ error: "Enter a percentage or amount." }, { status: 400 });
  }

  const bucketPercentage = bucket.percentage ?? 0;
  const existingBucketPercentage = await getBucketAllocationPercentage(bucketId);
  const nextBucketPercentage = existingBucketPercentage + resolvedPercentage;
  if (bucketPercentage > 0 && nextBucketPercentage > bucketPercentage + 1e-9) {
    return NextResponse.json(
      { error: "Allocation percentages cannot exceed this bucket's official percentage." },
      { status: 400 },
    );
  }

  const resolvedAmount = percentageToAmount(resolvedPercentage, totalIncome);

  try {
    const row = await prisma.bucketAllocation.create({
      data: {
        bucketId,
        label,
        amount: new Prisma.Decimal(resolvedAmount),
        percentage: resolvedPercentage,
        platform,
        allocationType,
      },
    });
    const bucketTotal = await prisma.bucketAllocation.aggregate({
      where: { bucketId },
      _sum: { amount: true },
    });
    await prisma.bucket.update({
      where: { id: bucketId },
      data: {
        allocatedAmount: bucketTotal._sum.amount ?? new Prisma.Decimal(0),
        percentage: bucket.percentage ?? nextBucketPercentage,
      },
    });
    return NextResponse.json(
      {
        id: row.id,
        bucketId: row.bucketId,
        label: row.label,
        amount: row.amount.toString(),
        percentage: row.percentage,
        platform: row.platform,
        allocationType: row.allocationType,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create allocation" }, { status: 500 });
  }
}

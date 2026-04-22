import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { getBucketAllocationPercentage } from "@/lib/income/bucket-percentage";
import { getTotalIncomeForUser } from "@/lib/income/recalculate-allocation-amounts";
import { amountToPercentage, percentageToAmount } from "@/lib/utils/currency";
import { prisma } from "@/lib/prisma";
import { updateAllocationSchema } from "@/lib/validations/income-api";

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const json: unknown = await req.json();
  const parsed = updateAllocationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.bucketAllocation.findFirst({
    where: { id },
    include: { bucket: true },
  });
  if (!existing || existing.bucket.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const totalIncome = await getTotalIncomeForUser(auth.user.id);
  if (totalIncome <= 0) {
    return NextResponse.json(
      { error: "Add income before updating allocations." },
      { status: 400 },
    );
  }

  const nextPercentage =
    parsed.data.percentage !== undefined
      ? parsed.data.percentage
      : parsed.data.amount !== undefined
        ? amountToPercentage(parsed.data.amount, totalIncome)
        : (existing.percentage ?? amountToPercentage(Number(existing.amount), totalIncome));

  const currentBucketPct = await getBucketAllocationPercentage(existing.bucketId);
  const nextBucketPct = currentBucketPct - (existing.percentage ?? 0) + nextPercentage;
  const bucketPctLimit = existing.bucket.percentage ?? 0;
  if (bucketPctLimit > 0 && nextBucketPct > bucketPctLimit + 1e-9) {
    return NextResponse.json(
      { error: "Allocation percentages cannot exceed this bucket's official percentage." },
      { status: 400 },
    );
  }
  const nextAmount = percentageToAmount(nextPercentage, totalIncome);

  const data: {
    label?: string;
    amount?: Prisma.Decimal;
    percentage?: number;
    platform?: string;
    allocationType?: string;
  } = {};
  if (parsed.data.label !== undefined) data.label = parsed.data.label;
  if (parsed.data.amount !== undefined || parsed.data.percentage !== undefined) {
    data.percentage = nextPercentage;
    data.amount = new Prisma.Decimal(nextAmount);
  }
  if (parsed.data.platform !== undefined) data.platform = parsed.data.platform;
  if (parsed.data.allocationType !== undefined)
    data.allocationType = parsed.data.allocationType;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  try {
    const row = await prisma.bucketAllocation.update({
      where: { id },
      data,
    });
    const bucketTotal = await prisma.bucketAllocation.aggregate({
      where: { bucketId: existing.bucketId },
      _sum: { amount: true },
    });
    await prisma.bucket.update({
      where: { id: existing.bucketId },
      data: {
        allocatedAmount: bucketTotal._sum.amount ?? new Prisma.Decimal(0),
        percentage: existing.bucket.percentage ?? nextBucketPct,
      },
    });
    return NextResponse.json({
      id: row.id,
      bucketId: row.bucketId,
      label: row.label,
      amount: row.amount.toString(),
      percentage: row.percentage,
      platform: row.platform,
      allocationType: row.allocationType,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update allocation" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const existing = await prisma.bucketAllocation.findFirst({
    where: { id },
    include: { bucket: true },
  });
  if (!existing || existing.bucket.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.bucketAllocation.delete({ where: { id } });
    const bucketTotal = await prisma.bucketAllocation.aggregate({
      where: { bucketId: existing.bucketId },
      _sum: { amount: true },
    });
    await prisma.bucket.update({
      where: { id: existing.bucketId },
      data: {
        allocatedAmount: bucketTotal._sum.amount ?? new Prisma.Decimal(0),
        percentage: await getBucketAllocationPercentage(existing.bucketId),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete allocation" }, { status: 500 });
  }
}

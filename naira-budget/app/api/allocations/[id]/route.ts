import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { sumAllocationsForBucket } from "@/lib/income/allocation-sum";
import { toNumber } from "@/lib/income/money";
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

  const bucketId = existing.bucketId;
  const cap = toNumber(existing.bucket.allocatedAmount);

  const nextAmount =
    parsed.data.amount !== undefined ? parsed.data.amount : toNumber(existing.amount);
  const others = await sumAllocationsForBucket(bucketId, id);
  if (others + nextAmount > cap + 1e-9) {
    return NextResponse.json(
      {
        error: "Allocations in this bucket cannot exceed the bucket total.",
      },
      { status: 400 },
    );
  }

  const data: {
    label?: string;
    amount?: Prisma.Decimal;
    platform?: string;
    allocationType?: string;
  } = {};
  if (parsed.data.label !== undefined) data.label = parsed.data.label;
  if (parsed.data.amount !== undefined) data.amount = new Prisma.Decimal(parsed.data.amount);
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
    return NextResponse.json({
      id: row.id,
      bucketId: row.bucketId,
      label: row.label,
      amount: row.amount.toString(),
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete allocation" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { sumAllocationsForBucket } from "@/lib/income/allocation-sum";
import { prisma } from "@/lib/prisma";
import { updateBucketSchema } from "@/lib/validations/income-api";

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const json: unknown = await req.json();
  const parsed = updateBucketSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.bucket.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.allocatedAmount !== undefined) {
    const allocSum = await sumAllocationsForBucket(id);
    if (parsed.data.allocatedAmount + 1e-9 < allocSum) {
      return NextResponse.json(
        {
          error:
            "Bucket total cannot be less than the sum of allocations inside it. Adjust or remove allocations first.",
        },
        { status: 400 },
      );
    }
  }

  const data: {
    name?: string;
    color?: string;
    allocatedAmount?: Prisma.Decimal;
    sortOrder?: number;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.color !== undefined) data.color = parsed.data.color;
  if (parsed.data.allocatedAmount !== undefined) {
    data.allocatedAmount = new Prisma.Decimal(parsed.data.allocatedAmount);
  }
  if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  try {
    const row = await prisma.bucket.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sortOrder,
      allocatedAmount: row.allocatedAmount.toString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update bucket" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const existing = await prisma.bucket.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.bucket.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete bucket" }, { status: 500 });
  }
}

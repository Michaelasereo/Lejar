import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { sumAllocationsForBucket } from "@/lib/income/allocation-sum";
import { toNumber } from "@/lib/income/money";
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

  const { label, amount, platform, allocationType } = parsed.data;
  const others = await sumAllocationsForBucket(bucketId);
  const cap = toNumber(bucket.allocatedAmount);
  if (others + amount > cap + 1e-9) {
    return NextResponse.json(
      {
        error: "Allocations in this bucket cannot exceed the bucket total.",
      },
      { status: 400 },
    );
  }

  try {
    const row = await prisma.bucketAllocation.create({
      data: {
        bucketId,
        label,
        amount: new Prisma.Decimal(amount),
        platform,
        allocationType,
      },
    });
    return NextResponse.json(
      {
        id: row.id,
        bucketId: row.bucketId,
        label: row.label,
        amount: row.amount.toString(),
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

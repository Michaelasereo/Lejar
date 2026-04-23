import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { getTotalIncomeForUser } from "@/lib/income/recalculate-allocation-amounts";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      percentage: z.number().min(0).max(100),
    }),
  ),
  expectedTotalPercentage: z.number().min(0).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { updates, expectedTotalPercentage } = parsed.data;
  if (updates.length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const ids = updates.map((row) => row.id);
  const buckets = await prisma.bucket.findMany({
    where: { userId: auth.user.id, id: { in: ids } },
    select: { id: true },
  });
  if (buckets.length !== ids.length) {
    return NextResponse.json({ error: "Some buckets were not found" }, { status: 400 });
  }

  const updatedMap = new Map(updates.map((row) => [row.id, row.percentage]));
  const allBuckets = await prisma.bucket.findMany({
    where: { userId: auth.user.id },
    select: { id: true, percentage: true },
  });
  const finalTotal = allBuckets.reduce((sum, bucket) => {
    const next = updatedMap.get(bucket.id);
    return sum + (typeof next === "number" ? next : bucket.percentage ?? 0);
  }, 0);
  const expected = expectedTotalPercentage ?? 100;
  if (Math.abs(finalTotal - expected) > 0.01) {
    return NextResponse.json({ error: "Percentages must sum to target total." }, { status: 400 });
  }

  const totalIncome = await getTotalIncomeForUser(auth.user.id);
  await prisma.$transaction(
    updates.map((update) =>
      prisma.bucket.update({
        where: { id: update.id },
        data: {
          percentage: update.percentage,
          allocatedAmount: new Prisma.Decimal(
            Math.round((update.percentage / 100) * totalIncome),
          ),
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}

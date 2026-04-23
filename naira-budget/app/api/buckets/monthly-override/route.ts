import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";

const schema = z.object({
  monthKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  updates: z.array(
    z.object({
      bucketId: z.string().min(1),
      percentage: z.number().min(0).max(100),
      allocatedAmount: z.number().min(0),
    }),
  ),
  newBucket: z
    .object({
      name: z.string().min(1),
      color: z.string().min(1),
      percentage: z.number().min(0).max(100),
      allocatedAmount: z.number().min(0),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const userId = auth.user.id;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { monthKey, updates, newBucket } = parsed.data;
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  try {
    await prisma.$transaction(async (tx) => {
      const bucketIds = updates.map((row) => row.bucketId);
      if (bucketIds.length === 0 && !newBucket) {
        throw new Error("No updates provided");
      }
      if (bucketIds.length > 0) {
        const existing = await tx.bucket.findMany({
          where: { userId, id: { in: bucketIds } },
          select: { id: true },
        });
        if (existing.length !== bucketIds.length) {
          throw new Error("Some buckets were not found");
        }
      }

      let createdBucketId: string | null = null;
      if (newBucket) {
        const maxSort = await tx.bucket.aggregate({
          where: { userId },
          _max: { sortOrder: true },
        });
        const created = await tx.bucket.create({
          data: {
            userId,
            name: newBucket.name.trim(),
            color: newBucket.color,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            percentage: 0,
            allocatedAmount: new Prisma.Decimal(0),
          },
        });
        createdBucketId = created.id;
      }

      await tx.monthlyBucketOverride.deleteMany({
        where: { userId, monthKey },
      });

      for (const row of updates) {
        await tx.monthlyBucketOverride.create({
          data: {
            userId,
            monthKey,
            bucketId: row.bucketId,
            allocatedAmount: new Prisma.Decimal(Math.round(row.allocatedAmount)),
            percentage: row.percentage,
          },
        });
      }

      if (createdBucketId && newBucket) {
        await tx.monthlyBucketOverride.create({
          data: {
            userId,
            monthKey,
            bucketId: createdBucketId,
            allocatedAmount: new Prisma.Decimal(Math.round(newBucket.allocatedAmount)),
            percentage: newBucket.percentage,
          },
        });
      }
    });

    await refreshSnapshotsForMonths(prisma, userId, [{ year, month }]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save monthly overrides" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("monthKey");
  if (!monthKey || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    return NextResponse.json({ error: "Invalid monthKey" }, { status: 400 });
  }

  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  try {
    await prisma.monthlyBucketOverride.deleteMany({
      where: { userId: auth.user.id, monthKey },
    });
    await refreshSnapshotsForMonths(prisma, auth.user.id, [{ year, month }]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not clear monthly overrides" },
      { status: 500 },
    );
  }
}

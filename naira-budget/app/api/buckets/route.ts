import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { createBucketSchema } from "@/lib/validations/income-api";

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

  const { name, color, allocatedAmount } = parsed.data;

  try {
    const agg = await prisma.bucket.aggregate({
      where: { userId: auth.user.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    const row = await prisma.bucket.create({
      data: {
        userId: auth.user.id,
        name,
        color,
        sortOrder,
        allocatedAmount: new Prisma.Decimal(allocatedAmount),
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        name: row.name,
        color: row.color,
        sortOrder: row.sortOrder,
        allocatedAmount: row.allocatedAmount.toString(),
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create bucket" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  totalAmount: z.number().min(0),
  breakdown: z.record(z.string(), z.number()).optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const row = await prisma.userLiability.findUnique({ where: { userId: auth.user.id } });
  return NextResponse.json({
    totalAmount: row ? Number(row.totalAmount) : 0,
    breakdown: row?.breakdown ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const body: unknown = await req.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const row = await prisma.userLiability.upsert({
    where: { userId: auth.user.id },
    create: {
      userId: auth.user.id,
      totalAmount: new Prisma.Decimal(parsed.data.totalAmount),
      breakdown:
        parsed.data.breakdown == null
          ? Prisma.JsonNull
          : (parsed.data.breakdown as Prisma.InputJsonValue),
    },
    update: {
      totalAmount: new Prisma.Decimal(parsed.data.totalAmount),
      breakdown:
        parsed.data.breakdown == null
          ? Prisma.JsonNull
          : (parsed.data.breakdown as Prisma.InputJsonValue),
    },
  });

  return NextResponse.json({
    totalAmount: Number(row.totalAmount),
    breakdown: row.breakdown ?? null,
  });
}

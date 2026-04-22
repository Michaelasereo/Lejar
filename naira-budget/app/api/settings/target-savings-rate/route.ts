import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  targetSavingsRate: z.number().min(0).max(100),
});

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const row = await prisma.userSettings.upsert({
    where: { userId: auth.user.id },
    update: { targetSavingsRate: parsed.data.targetSavingsRate },
    create: {
      userId: auth.user.id,
      isOnboarded: true,
      targetSavingsRate: parsed.data.targetSavingsRate,
    },
    select: { targetSavingsRate: true },
  });

  return NextResponse.json({ targetSavingsRate: row.targetSavingsRate });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";

async function syncCompletion(
  tx: Prisma.TransactionClient,
  jarId: string,
): Promise<void> {
  const jar = await tx.savingsJar.findUnique({ where: { id: jarId } });
  if (!jar) return;
  const saved = Number(jar.savedAmount);
  const target = Number(jar.targetAmount);
  const shouldComplete = target > 0 && saved >= target;
  if (shouldComplete !== jar.isCompleted) {
    await tx.savingsJar.update({
      where: { id: jarId },
      data: { isCompleted: shouldComplete },
    });
  }
}

type ContribContext = {
  params: { id: string; contributionId: string };
};

export async function DELETE(_req: NextRequest, ctx: ContribContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id: jarId, contributionId } = ctx.params;

  try {
    const jar = await prisma.savingsJar.findFirst({
      where: { id: jarId, userId: auth.user.id },
    });
    if (!jar) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contrib = await prisma.jarContribution.findFirst({
      where: { id: contributionId, jarId },
    });
    if (!contrib) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.jarContribution.delete({ where: { id: contributionId } });
      await tx.savingsJar.update({
        where: { id: jarId },
        data: {
          savedAmount: { decrement: contrib.amount },
        },
      });
      await syncCompletion(tx, jarId);
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete contribution" }, { status: 500 });
  }
}

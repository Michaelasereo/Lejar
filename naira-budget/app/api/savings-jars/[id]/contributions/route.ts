import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { contributionSchema } from "@/lib/validations/jar";

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

type JarIdContext = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: JarIdContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id: jarId } = ctx.params;

  try {
    const jar = await prisma.savingsJar.findFirst({
      where: { id: jarId, userId: auth.user.id },
    });
    if (!jar) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rows = await prisma.jarContribution.findMany({
      where: { jarId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      contributions: rows.map((c) => ({
        id: c.id,
        amount: c.amount.toString(),
        note: c.note,
        date: c.date.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not list contributions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: JarIdContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id: jarId } = ctx.params;
  const json: unknown = await req.json();
  const parsed = contributionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const date =
    body.date !== undefined ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const jar = await prisma.savingsJar.findFirst({
      where: { id: jarId, userId: auth.user.id },
    });
    if (!jar) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.jarContribution.create({
        data: {
          jarId,
          amount: new Prisma.Decimal(body.amount),
          note: body.note ?? null,
          date,
        },
      });
      await tx.savingsJar.update({
        where: { id: jarId },
        data: {
          savedAmount: { increment: new Prisma.Decimal(body.amount) },
        },
      });
      await syncCompletion(tx, jarId);
      return created;
    });

    return NextResponse.json(
      {
        id: row.id,
        amount: row.amount.toString(),
        note: row.note,
        date: row.date.toISOString(),
        createdAt: row.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not add contribution" }, { status: 500 });
  }
}

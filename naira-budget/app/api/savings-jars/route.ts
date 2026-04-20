import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { createJarSchema } from "@/lib/validations/jar";

function parseOptionalDate(s: string | undefined | null): Date | null {
  if (s === undefined || s === null || s === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  try {
    const rows = await prisma.savingsJar.findMany({
      where: { userId: auth.user.id },
      orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { contributions: true } },
      },
    });

    const body = rows.map((r) => ({
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      targetAmount: r.targetAmount.toString(),
      savedAmount: r.savedAmount.toString(),
      monthlyTarget: r.monthlyTarget?.toString() ?? null,
      dueDate: r.dueDate?.toISOString() ?? null,
      color: r.color,
      isCompleted: r.isCompleted,
      isPinned: r.isPinned,
      category: r.category,
      notes: r.notes,
      sortOrder: r.sortOrder,
      contributionCount: r._count.contributions,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ jars: body });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not list jars" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = createJarSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const dueDate = parseOptionalDate(body.dueDate ?? undefined);

  try {
    const agg = await prisma.savingsJar.aggregate({
      where: { userId: auth.user.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    const row = await prisma.savingsJar.create({
      data: {
        userId: auth.user.id,
        name: body.name.trim(),
        emoji: body.emoji ?? "🏦",
        targetAmount: new Prisma.Decimal(body.targetAmount),
        monthlyTarget:
          body.monthlyTarget !== undefined && body.monthlyTarget !== null
            ? new Prisma.Decimal(body.monthlyTarget)
            : null,
        dueDate,
        color: body.color ?? "#16a34a",
        category: body.category ?? "OTHER",
        notes: body.notes ?? null,
        isPinned: body.isPinned ?? false,
        sortOrder,
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        name: row.name,
        emoji: row.emoji,
        targetAmount: row.targetAmount.toString(),
        savedAmount: row.savedAmount.toString(),
        monthlyTarget: row.monthlyTarget?.toString() ?? null,
        dueDate: row.dueDate?.toISOString() ?? null,
        color: row.color,
        isCompleted: row.isCompleted,
        isPinned: row.isPinned,
        category: row.category,
        notes: row.notes,
        sortOrder: row.sortOrder,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create jar" }, { status: 500 });
  }
}

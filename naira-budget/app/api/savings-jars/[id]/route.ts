import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { patchJarSchema } from "@/lib/validations/jar";

function parseOptionalDate(s: string | undefined | null): Date | null {
  if (s === undefined || s === null || s === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

type JarIdContext = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: JarIdContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = ctx.params;

  try {
    const row = await prisma.savingsJar.findFirst({
      where: { id, userId: auth.user.id },
      include: {
        contributions: {
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
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
      contributions: row.contributions.map((c) => ({
        id: c.id,
        amount: c.amount.toString(),
        note: c.note,
        date: c.date.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load jar" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: JarIdContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = ctx.params;
  const json: unknown = await req.json();
  const parsed = patchJarSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;

  try {
    const existing = await prisma.savingsJar.findFirst({
      where: { id, userId: auth.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const dueDate =
      body.dueDate !== undefined ? parseOptionalDate(body.dueDate) : undefined;

    const data: Prisma.SavingsJarUpdateInput = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.emoji !== undefined) data.emoji = body.emoji;
    if (body.targetAmount !== undefined) {
      data.targetAmount = new Prisma.Decimal(body.targetAmount);
    }
    if (body.monthlyTarget !== undefined) {
      data.monthlyTarget =
        body.monthlyTarget === null
          ? null
          : new Prisma.Decimal(body.monthlyTarget);
    }
    if (dueDate !== undefined) data.dueDate = dueDate;
    if (body.color !== undefined) data.color = body.color;
    if (body.category !== undefined) data.category = body.category;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.isPinned !== undefined) data.isPinned = body.isPinned;
    if (body.savedAmount !== undefined) {
      data.savedAmount = new Prisma.Decimal(body.savedAmount);
    }
    if (body.isCompleted !== undefined) data.isCompleted = body.isCompleted;

    const row = await prisma.savingsJar.update({
      where: { id },
      data,
    });

    return NextResponse.json({
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
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update jar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: JarIdContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = ctx.params;

  try {
    const existing = await prisma.savingsJar.findFirst({
      where: { id, userId: auth.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.savingsJar.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete jar" }, { status: 500 });
  }
}

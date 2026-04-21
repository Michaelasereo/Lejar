import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { patchGroupJarSchema } from "@/lib/validations/jar";

type Ctx = { params: { id: string } };

async function getMembership(jarId: string, userId: string) {
  return prisma.groupJarMember.findFirst({
    where: { jarId, userId, status: "ACTIVE" },
  });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const membership = await getMembership(ctx.params.id, auth.user.id);
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const jar = await prisma.groupSavingsJar.findUnique({
    where: { id: ctx.params.id },
    include: { members: true, contributions: true },
  });
  if (!jar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(jar);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const admin = await prisma.groupJarMember.findFirst({
    where: { jarId: ctx.params.id, userId: auth.user.id, role: "ADMIN", status: "ACTIVE" },
  });
  if (!admin) return NextResponse.json({ error: "Only admin can edit" }, { status: 403 });

  const parsed = patchGroupJarSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const body = parsed.data;
  const data: Prisma.GroupSavingsJarUpdateInput = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.emoji !== undefined) data.emoji = body.emoji;
  if (body.targetAmount !== undefined) data.targetAmount = new Prisma.Decimal(body.targetAmount);
  if (body.color !== undefined) data.color = body.color;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.isCompleted !== undefined) data.isCompleted = body.isCompleted;

  const row = await prisma.groupSavingsJar.update({ where: { id: ctx.params.id }, data });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return PUT(req, ctx);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const admin = await prisma.groupJarMember.findFirst({
    where: { jarId: ctx.params.id, userId: auth.user.id, role: "ADMIN", status: "ACTIVE" },
  });
  if (!admin) return NextResponse.json({ error: "Only admin can delete" }, { status: 403 });

  await prisma.groupSavingsJar.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { safelySendEmail, sendGroupJarInvite } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { createGroupJarSchema } from "@/lib/validations/jar";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const rows = await prisma.groupSavingsJar.findMany({
    where: {
      OR: [
        { createdById: auth.user.id },
        { members: { some: { userId: auth.user.id, status: "ACTIVE" } } },
      ],
    },
    include: {
      members: true,
      contributions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    jars: rows.map((jar) => ({
      id: jar.id,
      name: jar.name,
      emoji: jar.emoji,
      targetAmount: jar.targetAmount.toString(),
      dueDate: jar.dueDate?.toISOString() ?? null,
      color: jar.color,
      notes: jar.notes,
      isCompleted: jar.isCompleted,
      createdById: jar.createdById,
      memberCount: jar.members.length,
      totalSaved: jar.contributions.reduce((sum, c) => sum + Number(c.amount.toString()), 0),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const parsed = createGroupJarSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const body = parsed.data;
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const created = await prisma.$transaction(async (tx) => {
    const jar = await tx.groupSavingsJar.create({
      data: {
        createdById: auth.user.id,
        name: body.name.trim(),
        emoji: body.emoji,
        targetAmount: new Prisma.Decimal(body.targetAmount),
        dueDate,
        color: body.color,
        notes: body.notes?.trim() || null,
      },
    });

    await tx.groupJarMember.create({
      data: {
        jarId: jar.id,
        userId: auth.user.id,
        email: auth.user.email ?? `${auth.user.id}@local`,
        displayName: auth.user.email ?? "Admin",
        role: "ADMIN",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    if (body.inviteEmails.length > 0) {
      await tx.groupJarMember.createMany({
        data: body.inviteEmails.map((email) => ({
          jarId: jar.id,
          email,
          role: "MEMBER" as const,
          status: "PENDING" as const,
        })),
      });
    }

    return jar;
  });

  if (body.inviteEmails.length > 0) {
    const [members, memberCount] = await Promise.all([
      prisma.groupJarMember.findMany({
        where: { jarId: created.id, email: { in: body.inviteEmails } },
        select: { email: true, inviteToken: true },
      }),
      prisma.groupJarMember.count({ where: { jarId: created.id, status: "ACTIVE" } }),
    ]);

    const inviterName =
      (auth.user.user_metadata?.full_name as string | undefined)?.trim() ||
      auth.user.email?.split("@")[0] ||
      "Someone";

    await Promise.allSettled(
      members.map((member) =>
        safelySendEmail(() =>
          sendGroupJarInvite({
            toEmail: member.email,
            inviterName,
            jarName: created.name,
            jarEmoji: created.emoji,
            targetAmount: Number(created.targetAmount),
            dueDate: created.dueDate ?? undefined,
            memberCount,
            notes: created.notes ?? undefined,
            inviteToken: member.inviteToken,
          }),
        ),
      ),
    );
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}

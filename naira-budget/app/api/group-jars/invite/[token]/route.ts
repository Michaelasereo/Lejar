import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";

type Ctx = { params: { token: string } };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const invite = await prisma.groupJarMember.findUnique({
    where: { inviteToken: ctx.params.token },
    include: { jar: true },
  });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  return NextResponse.json(invite);
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const invite = await prisma.groupJarMember.findUnique({
    where: { inviteToken: ctx.params.token },
  });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "Invite is no longer pending" }, { status: 400 });
  }

  const updated = await prisma.groupJarMember.update({
    where: { inviteToken: ctx.params.token },
    data: {
      userId: auth.user.id,
      status: "ACTIVE",
      joinedAt: new Date(),
      displayName: auth.user.email ?? invite.displayName,
    },
  });
  return NextResponse.json({ ...updated, jarId: updated.jarId });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const invite = await prisma.groupJarMember.findUnique({
    where: { inviteToken: ctx.params.token },
  });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  const updated = await prisma.groupJarMember.update({
    where: { inviteToken: ctx.params.token },
    data: { status: "DECLINED" },
  });
  return NextResponse.json(updated);
}

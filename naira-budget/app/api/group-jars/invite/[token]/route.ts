import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { canAccessInviteByEmail } from "@/lib/security/group-invite";
import { getClientIp, limitByKey } from "@/lib/security/rate-limit";
import { z } from "zod";

type Ctx = { params: { token: string } };
const tokenSchema = z.string().min(8).max(191);

function forbiddenInviteResponse() {
  return NextResponse.json({ error: "Invite not found" }, { status: 404 });
}

function applyInviteRateLimit(req: NextRequest, token: string) {
  const ip = getClientIp(req.headers.get("x-forwarded-for"));
  return limitByKey({
    namespace: "group-invite-token",
    keyParts: [token, ip],
    max: 30,
    windowMs: 60_000,
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const parsedToken = tokenSchema.safeParse(ctx.params.token);
  if (!parsedToken.success) return forbiddenInviteResponse();
  const rate = applyInviteRateLimit(req, parsedToken.data);
  if (!rate.allowed) {
    console.warn("[security] group-invite token rate-limit hit", { token: parsedToken.data.slice(0, 6) });
    return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const invite = await prisma.groupJarMember.findUnique({
    where: { inviteToken: parsedToken.data },
    include: { jar: true },
  });
  if (!invite) return forbiddenInviteResponse();

  if (!canAccessInviteByEmail(auth.user.email ?? null, invite.email)) {
    return forbiddenInviteResponse();
  }
  return NextResponse.json(invite);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const parsedToken = tokenSchema.safeParse(ctx.params.token);
  if (!parsedToken.success) return forbiddenInviteResponse();
  const rate = applyInviteRateLimit(req, parsedToken.data);
  if (!rate.allowed) {
    console.warn("[security] group-invite token rate-limit hit", { token: parsedToken.data.slice(0, 6) });
    return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const invite = await prisma.groupJarMember.findUnique({
    where: { inviteToken: parsedToken.data },
  });
  if (!invite) return forbiddenInviteResponse();

  if (!canAccessInviteByEmail(auth.user.email ?? null, invite.email)) {
    return forbiddenInviteResponse();
  }

  if (invite.userId && invite.userId !== auth.user.id) {
    return forbiddenInviteResponse();
  }

  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "Invite is no longer pending" }, { status: 400 });
  }

  const updated = await prisma.groupJarMember.update({
    where: { inviteToken: parsedToken.data },
    data: {
      userId: auth.user.id,
      status: "ACTIVE",
      joinedAt: new Date(),
      displayName: auth.user.email ?? invite.displayName,
    },
  });
  return NextResponse.json({ ...updated, jarId: updated.jarId });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const parsedToken = tokenSchema.safeParse(ctx.params.token);
  if (!parsedToken.success) return forbiddenInviteResponse();
  const rate = applyInviteRateLimit(req, parsedToken.data);
  if (!rate.allowed) {
    console.warn("[security] group-invite token rate-limit hit", { token: parsedToken.data.slice(0, 6) });
    return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const invite = await prisma.groupJarMember.findUnique({
    where: { inviteToken: parsedToken.data },
  });
  if (!invite) return forbiddenInviteResponse();

  if (!canAccessInviteByEmail(auth.user.email ?? null, invite.email)) {
    return forbiddenInviteResponse();
  }

  const updated = await prisma.groupJarMember.update({
    where: { inviteToken: parsedToken.data },
    data: { status: "DECLINED" },
  });
  return NextResponse.json(updated);
}

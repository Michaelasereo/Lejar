import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { safelySendEmail, sendGroupJarInvite } from "@/lib/email";

const schema = z.object({ emails: z.array(z.string().email()).min(1).max(10) });
type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const admin = await prisma.groupJarMember.findFirst({
    where: { jarId: ctx.params.id, userId: auth.user.id, role: "ADMIN", status: "ACTIVE" },
  });
  if (!admin) return NextResponse.json({ error: "Only admin can invite" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await prisma.groupJarMember.findMany({
    where: { jarId: ctx.params.id },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => e.email.toLowerCase()));
  const emails = parsed.data.emails.filter((email) => !existingEmails.has(email.toLowerCase()));

  if (emails.length > 0) {
    await prisma.groupJarMember.createMany({
      data: emails.map((email) => ({
        jarId: ctx.params.id,
        email,
        role: "MEMBER",
        status: "PENDING",
      })),
    });
  }

  if (emails.length > 0) {
    const [jar, createdMembers, memberCount] = await Promise.all([
      prisma.groupSavingsJar.findUnique({
        where: { id: ctx.params.id },
        select: {
          name: true,
          emoji: true,
          targetAmount: true,
          dueDate: true,
          notes: true,
        },
      }),
      prisma.groupJarMember.findMany({
        where: { jarId: ctx.params.id, email: { in: emails } },
        select: { email: true, inviteToken: true },
      }),
      prisma.groupJarMember.count({ where: { jarId: ctx.params.id, status: "ACTIVE" } }),
    ]);

    if (jar) {
      const inviterName =
        (auth.user.user_metadata?.full_name as string | undefined)?.trim() ||
        auth.user.email?.split("@")[0] ||
        "Someone";

      await Promise.allSettled(
        createdMembers.map((member) =>
          safelySendEmail(() =>
            sendGroupJarInvite({
              toEmail: member.email,
              inviterName,
              jarName: jar.name,
              jarEmoji: jar.emoji,
              targetAmount: Number(jar.targetAmount),
              dueDate: jar.dueDate ?? undefined,
              memberCount,
              notes: jar.notes ?? undefined,
              inviteToken: member.inviteToken,
            }),
          ),
        ),
      );
    }
  }

  return NextResponse.json({ invited: emails.length });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { groupContributeSchema } from "@/lib/validations/jar";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireUser();
    if (!auth.user) return auth.error;

    const parsed = groupContributeSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const member = await prisma.groupJarMember.findFirst({
      where: { jarId: ctx.params.id, userId: auth.user.id, status: "ACTIVE" },
    });
    if (!member) return NextResponse.json({ error: "You are not a member" }, { status: 403 });

    const date = parsed.data.date ? new Date(parsed.data.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const created = await prisma.groupJarContribution.create({
      data: {
        jarId: ctx.params.id,
        memberId: member.id,
        amount: new Prisma.Decimal(parsed.data.amount),
        note: parsed.data.note?.trim() || null,
        date,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[group-jars/contribute] failed", {
      jarId: ctx.params.id,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json({ error: "Could not log contribution" }, { status: 500 });
  }
}

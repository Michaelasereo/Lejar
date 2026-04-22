import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const updated = await prisma.userMilestone.updateMany({
    where: { id: params.id, userId: auth.user.id },
    data: { isNew: false },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

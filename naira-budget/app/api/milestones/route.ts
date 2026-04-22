import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const milestones = await prisma.userMilestone.findMany({
    where: { userId: auth.user.id },
    orderBy: { achievedAt: "desc" },
    take: 40,
  });

  return NextResponse.json({ milestones });
}

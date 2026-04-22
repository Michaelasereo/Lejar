import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { ensureWeeklyLoggingGraceWarning, getUserStreaks } from "@/lib/utils/streaks";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  await ensureWeeklyLoggingGraceWarning(auth.user.id);

  const [streaks, warnings] = await Promise.all([
    getUserStreaks(auth.user.id),
    prisma.streakWarning.findMany({
      where: {
        userId: auth.user.id,
        isDismissed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ streaks, warnings });
}

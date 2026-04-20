import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { analyticsSnapshotBodySchema } from "@/lib/validations/analytics-api";
import { upsertMonthlySnapshotForMonth } from "@/lib/utils/analytics";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = analyticsSnapshotBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await upsertMonthlySnapshotForMonth(prisma, auth.user.id, {
      year: parsed.data.year,
      month: parsed.data.month,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save snapshot" }, { status: 500 });
  }
}

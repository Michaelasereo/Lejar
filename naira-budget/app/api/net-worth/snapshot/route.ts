import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { parseMonthParam } from "@/lib/utils/dates";
import { saveNetWorthSnapshot } from "@/lib/utils/networth";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month") ?? undefined;
  const { year, month } = parseMonthParam(monthParam);

  await saveNetWorthSnapshot(auth.user.id, year, month);
  return NextResponse.json({ ok: true });
}

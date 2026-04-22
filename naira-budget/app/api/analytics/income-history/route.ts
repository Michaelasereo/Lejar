import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getIncomeForMonth } from "@/lib/utils/income";
import { getMonthsBetween } from "@/lib/utils/dates";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const months = getMonthsBetween(fromYear, fromMonth, toYear, toMonth);

  const values = await Promise.all(
    months.map(async (ref) => ({
      month: `${ref.year}-${String(ref.month).padStart(2, "0")}`,
      income: await getIncomeForMonth(auth.user.id, ref.year, ref.month),
    })),
  );

  return NextResponse.json(values);
}

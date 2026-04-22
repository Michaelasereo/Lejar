import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getIncomeHistory } from "@/lib/utils/income";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const rows = await getIncomeHistory(auth.user.id);
  return NextResponse.json({
    income: rows.map((row) => ({
      id: row.id,
      label: row.label,
      amountMonthly: Number(row.amountMonthly),
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
    })),
  });
}

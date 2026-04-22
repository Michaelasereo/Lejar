import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { recalculateAllocationAmountsForUser } from "@/lib/income/recalculate-allocation-amounts";
import { prisma } from "@/lib/prisma";
import { refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { getMonthsBetween } from "@/lib/utils/dates";
import { backdateIncomeChange, updateIncomeWithHistory } from "@/lib/utils/income";
import { updateIncomeSchema } from "@/lib/validations/income-api";

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const json: unknown = await req.json();
  const parsed = updateIncomeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.incomeSource.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: { label?: string; amountMonthly?: Prisma.Decimal } = {};
  if (parsed.data.label !== undefined) data.label = parsed.data.label;
  const changingAmount = parsed.data.amountMonthly !== undefined;
  if (!changingAmount && Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  try {
    if (!changingAmount) {
      const row = await prisma.incomeSource.update({
        where: { id },
        data,
      });
      const now = new Date();
      const monthsToRefresh = getMonthsBetween(
        existing.effectiveFrom.getFullYear(),
        existing.effectiveFrom.getMonth() + 1,
        now.getFullYear(),
        now.getMonth() + 1,
      );
      await refreshSnapshotsForMonths(prisma, auth.user.id, monthsToRefresh);
      return NextResponse.json({
        id: row.id,
        label: row.label,
        amountMonthly: row.amountMonthly.toString(),
      });
    }

    if (!parsed.data.effectiveMonth) {
      return NextResponse.json(
        { error: "effectiveMonth required when changing amount" },
        { status: 400 },
      );
    }

    let affectedMonths: string[] = [];
    if (parsed.data.isBackdate) {
      const result = await backdateIncomeChange(
        auth.user.id,
        id,
        parsed.data.amountMonthly!,
        parsed.data.effectiveMonth,
      );
      affectedMonths = result.affectedMonths;
    } else {
      await updateIncomeWithHistory(
        auth.user.id,
        id,
        parsed.data.amountMonthly!,
        parsed.data.effectiveMonth,
      );
    }
    const [startYearStr, startMonthStr] = parsed.data.effectiveMonth.split("-");
    const now = new Date();
    const monthsToRefresh = getMonthsBetween(
      Number(startYearStr),
      Number(startMonthStr),
      now.getFullYear(),
      now.getMonth() + 1,
    );
    await refreshSnapshotsForMonths(prisma, auth.user.id, monthsToRefresh);

    const recalc = await recalculateAllocationAmountsForUser(auth.user.id);
    return NextResponse.json({
      updatedIncome: true,
      affectedMonths,
      recalculatedAllocations: recalc.updatedCount,
      allocationsRecalculated: recalc.updatedCount > 0,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update income source" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const existing = await prisma.incomeSource.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.incomeSource.delete({ where: { id } });
    const now = new Date();
    const monthsToRefresh = getMonthsBetween(
      existing.effectiveFrom.getFullYear(),
      existing.effectiveFrom.getMonth() + 1,
      now.getFullYear(),
      now.getMonth() + 1,
    );
    await refreshSnapshotsForMonths(prisma, auth.user.id, monthsToRefresh);
    const recalc = await recalculateAllocationAmountsForUser(auth.user.id);
    return NextResponse.json({ ok: true, allocationsRecalculated: recalc.updatedCount > 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete income source" }, { status: 500 });
  }
}

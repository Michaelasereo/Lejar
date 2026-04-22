import { endOfMonth } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { earliestUserMonth, refreshSnapshotsForMonths } from "@/lib/utils/analytics";
import { formatMonthParam, getMonthsBetween } from "@/lib/utils/dates";
import { getIncomeForMonth } from "@/lib/utils/income";

const HISTORICAL_EXPENSE_LABEL = "Historical spend (backfill)";

type MonthSummary = {
  monthKey: string;
  monthLabel: string;
  incomeOverride: number | null;
  spentBackfill: number | null;
  netChange: number;
};

async function buildMonthSummaries(userId: string): Promise<MonthSummary[]> {
  const now = new Date();
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
  const earliest = await earliestUserMonth(prisma, userId);
  const start = earliest ?? { year: now.getFullYear(), month: 1 };
  const months = getMonthsBetween(
    start.year,
    start.month,
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth() + 1,
  );
  if (months.length === 0) return [];

  const [overrides, backfills] = await Promise.all([
    prisma.monthlyIncomeOverride.findMany({
      where: { userId, monthKey: { in: months.map((ref) => formatMonthParam(ref.year, ref.month)) } },
      select: { monthKey: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { userId, category: "OTHER", label: HISTORICAL_EXPENSE_LABEL },
      select: { id: true, occurredAt: true, amount: true },
    }),
  ]);
  const overrideByMonth = new Map(overrides.map((row) => [row.monthKey, Number(row.amount)]));
  const backfillByMonth = new Map<string, number>();
  for (const row of backfills) {
    backfillByMonth.set(
      formatMonthParam(row.occurredAt.getFullYear(), row.occurredAt.getMonth() + 1),
      Number(row.amount),
    );
  }

  const summaries = await Promise.all(
    months.map(async (ref) => {
      const monthKey = formatMonthParam(ref.year, ref.month);
      const [income, expenseAgg] = await Promise.all([
        getIncomeForMonth(userId, ref.year, ref.month),
        prisma.expense.aggregate({
          where: {
            userId,
            occurredAt: {
              gte: new Date(ref.year, ref.month - 1, 1, 0, 0, 0, 0),
              lte: new Date(ref.year, ref.month, 0, 23, 59, 59, 999),
            },
          },
          _sum: { amount: true },
        }),
      ]);
      const totalExpenses = Number(expenseAgg._sum.amount ?? new Prisma.Decimal(0));
      return {
        monthKey,
        monthLabel: new Date(ref.year, ref.month - 1, 1).toLocaleDateString("en-NG", {
          month: "long",
          year: "numeric",
        }),
        incomeOverride: overrideByMonth.get(monthKey) ?? null,
        spentBackfill: backfillByMonth.get(monthKey) ?? null,
        netChange: income - totalExpenses,
      };
    }),
  );

  return summaries;
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const months = await buildMonthSummaries(auth.user.id);
  return NextResponse.json({ months });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const body = (await req.json()) as {
    monthKey?: string;
    incomeOverride?: number | null;
    spentBackfill?: number | null;
  };
  if (!body.monthKey || !/^\d{4}-\d{2}$/.test(body.monthKey)) {
    return NextResponse.json({ error: "Invalid monthKey" }, { status: 400 });
  }
  const [yearStr, monthStr] = body.monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid monthKey" }, { status: 400 });
  }

  if (body.incomeOverride !== undefined) {
    if (body.incomeOverride !== null && Number(body.incomeOverride) > 0) {
      await prisma.monthlyIncomeOverride.upsert({
        where: { userId_monthKey: { userId: auth.user.id, monthKey: body.monthKey } },
        create: {
          userId: auth.user.id,
          monthKey: body.monthKey,
          amount: new Prisma.Decimal(body.incomeOverride),
        },
        update: { amount: new Prisma.Decimal(body.incomeOverride) },
      });
    } else {
      await prisma.monthlyIncomeOverride.deleteMany({
        where: { userId: auth.user.id, monthKey: body.monthKey },
      });
    }
  }

  if (body.spentBackfill !== undefined) {
    const existing = await prisma.expense.findFirst({
      where: {
        userId: auth.user.id,
        category: "OTHER",
        label: HISTORICAL_EXPENSE_LABEL,
        occurredAt: {
          gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      },
    });
    if (body.spentBackfill !== null && Number(body.spentBackfill) > 0) {
      const payload = {
        amount: new Prisma.Decimal(body.spentBackfill),
        occurredAt: endOfMonth(new Date(year, month - 1, 1)),
      };
      if (existing) {
        await prisma.expense.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await prisma.expense.create({
          data: {
            userId: auth.user.id,
            amount: payload.amount,
            category: "OTHER",
            label: HISTORICAL_EXPENSE_LABEL,
            occurredAt: payload.occurredAt,
          },
        });
      }
    } else if (existing) {
      await prisma.expense.delete({ where: { id: existing.id } });
    }
  }

  await refreshSnapshotsForMonths(prisma, auth.user.id, [{ year, month }]);
  const months = await buildMonthSummaries(auth.user.id);
  return NextResponse.json({ ok: true, months });
}

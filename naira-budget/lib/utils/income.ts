import { endOfMonth, format, startOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMonthParam, getMonthsBetween, parseMonthParam } from "@/lib/utils/dates";

export async function getIncomeForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<number> {
  const monthKey = formatMonthParam(year, month);
  const override = await prisma.monthlyIncomeOverride.findUnique({
    where: { userId_monthKey: { userId, monthKey } },
    select: { amount: true },
  });
  if (override) {
    return Number(override.amount);
  }

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));

  const incomes = await prisma.incomeSource.findMany({
    where: {
      userId,
      isActive: true,
      effectiveFrom: { lte: monthEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthStart } }],
    },
  });

  return incomes.reduce((sum, income) => sum + Number(income.amountMonthly), 0);
}

export async function isIncomeOverridden(userId: string, monthKey: string): Promise<boolean> {
  const row = await prisma.monthlyIncomeOverride.findUnique({
    where: { userId_monthKey: { userId, monthKey } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function getCurrentIncome(userId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return prisma.incomeSource.findMany({
    where: {
      userId,
      isActive: true,
      effectiveFrom: { lte: monthEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthStart } }],
    },
    orderBy: { effectiveFrom: "asc" },
  });
}

export async function getIncomeHistory(userId: string) {
  return prisma.incomeSource.findMany({
    where: { userId, isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function updateIncomeWithHistory(
  userId: string,
  incomeId: string,
  newAmount: number,
  effectiveMonth: string,
): Promise<void> {
  const { date: effectiveFrom } = parseMonthParam(effectiveMonth);

  const existing = await prisma.incomeSource.findFirst({
    where: { id: incomeId, userId },
  });
  if (!existing) throw new Error("Income record not found");

  const closingMonth = new Date(effectiveFrom);
  closingMonth.setMonth(closingMonth.getMonth() - 1);

  await prisma.$transaction([
    prisma.incomeSource.update({
      where: { id: incomeId },
      data: { effectiveTo: endOfMonth(closingMonth) },
    }),
    prisma.incomeSource.create({
      data: {
        userId,
        label: existing.label,
        amountMonthly: new Prisma.Decimal(newAmount),
        effectiveFrom,
        effectiveTo: null,
        isActive: true,
      },
    }),
  ]);
}

export async function backdateIncomeChange(
  userId: string,
  incomeId: string,
  newAmount: number,
  effectiveMonth: string,
): Promise<{ affectedMonths: string[] }> {
  const { year, month, date: effectiveFrom } = parseMonthParam(effectiveMonth);
  const now = new Date();

  const existing = await prisma.incomeSource.findFirst({
    where: { id: incomeId, userId },
  });
  if (!existing) throw new Error("Income record not found");

  const affectedSnapshots = await prisma.monthlySnapshot.findMany({
    where: {
      userId,
      OR: [{ year: { gt: year } }, { year, month: { gte: month } }],
    },
    select: { id: true, year: true, month: true },
  });

  const closingMonth = new Date(effectiveFrom);
  closingMonth.setMonth(closingMonth.getMonth() - 1);

  await prisma.$transaction([
    prisma.incomeSource.update({
      where: { id: incomeId },
      data: { effectiveTo: endOfMonth(closingMonth) },
    }),
    prisma.incomeSource.create({
      data: {
        userId,
        label: existing.label,
        amountMonthly: new Prisma.Decimal(newAmount),
        effectiveFrom,
        effectiveTo: null,
        isActive: true,
      },
    }),
    ...affectedSnapshots.map((snapshot) =>
      prisma.monthlySnapshot.update({
        where: { id: snapshot.id },
        data: { needsRecalculation: true },
      }),
    ),
  ]);

  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  const affectedMonths = getMonthsBetween(year, month, endYear, endMonth).map((ref) =>
    formatMonthParam(ref.year, ref.month),
  );

  return { affectedMonths };
}

export function toIncomeRangeLabel(effectiveFrom: Date, effectiveTo: Date | null): string {
  const from = format(effectiveFrom, "MMMM yyyy");
  if (!effectiveTo) return `from ${from} - present`;
  return `from ${from} - ${format(effectiveTo, "MMMM yyyy")}`;
}

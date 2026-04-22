import { endOfMonth, startOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getIncomeForMonth } from "@/lib/utils/income";
import { getMonthsBetween } from "@/lib/utils/dates";

function toNum(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

export async function calculateCurrentNetWorth(userId: string): Promise<{
  cumulativeSavings: number;
  investmentPortfolio: number;
  jarsTotal: number;
  confirmedReturns: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}> {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);

  const snapshots = await prisma.monthlySnapshot.findMany({
    where: { userId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const currentMonthIncome = await getIncomeForMonth(
    userId,
    now.getFullYear(),
    now.getMonth() + 1,
  );
  const currentMonthExpenses = await prisma.expense.aggregate({
    where: {
      userId,
      occurredAt: {
        gte: currentMonthStart,
        lte: endOfMonth(now),
      },
    },
    _sum: { amount: true },
  });
  const currentMonthSaved = Math.max(0, currentMonthIncome - toNum(currentMonthExpenses._sum.amount));

  const historicalSavings = snapshots.reduce((sum, s) => sum + Math.max(0, toNum(s.totalSaved)), 0);
  const cumulativeSavings = historicalSavings + currentMonthSaved;

  const investments = await prisma.investment.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "MATURED"] },
    },
    select: { amount: true },
  });
  const investmentPortfolio = investments.reduce((sum, i) => sum + toNum(i.amount), 0);

  const confirmedInvestments = await prisma.investment.findMany({
    where: { userId, status: "MATURED_CONFIRMED" },
    select: { actualProfit: true },
  });
  const confirmedReturns = confirmedInvestments.reduce(
    (sum, i) => sum + toNum(i.actualProfit),
    0,
  );

  const [individualJars, groupContributions] = await Promise.all([
    prisma.savingsJar.aggregate({
      where: { userId },
      _sum: { savedAmount: true },
    }),
    prisma.groupJarContribution.aggregate({
      where: { member: { userId } },
      _sum: { amount: true },
    }),
  ]);
  const jarsTotal = toNum(individualJars._sum.savedAmount) + toNum(groupContributions._sum.amount);

  const liability = await prisma.userLiability.findUnique({ where: { userId } });
  const totalLiabilities = toNum(liability?.totalAmount);

  const totalAssets = cumulativeSavings + investmentPortfolio + confirmedReturns + jarsTotal;
  const netWorth = totalAssets - totalLiabilities;

  return {
    cumulativeSavings,
    investmentPortfolio,
    jarsTotal,
    confirmedReturns,
    totalAssets,
    totalLiabilities,
    netWorth,
  };
}

export async function calculateUnspentCarryover(
  userId: string,
  year: number,
  month: number,
): Promise<number> {
  const income = await getIncomeForMonth(userId, year, month);
  const buckets = await prisma.bucket.findMany({
    where: { userId },
    select: {
      id: true,
      allocatedAmount: true,
      percentage: true,
      allocations: {
        where: { allocationType: "SPENDING" },
        select: { percentage: true },
      },
    },
  });
  const spendingBudget = buckets.reduce((sum, bucket) => {
    const spendingPct = bucket.allocations.reduce((inner, row) => inner + (row.percentage ?? 0), 0);
    if (spendingPct > 0) return sum + (spendingPct / 100) * income;
    if (typeof bucket.percentage === "number" && bucket.percentage > 0) {
      return sum + (bucket.percentage / 100) * income;
    }
    return sum + toNum(bucket.allocatedAmount);
  }, 0);

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  const expenses = await prisma.expense.aggregate({
    where: {
      userId,
      occurredAt: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
  });
  const actualExpenses = toNum(expenses._sum.amount);
  return Math.max(0, spendingBudget - actualExpenses);
}

export async function getNetWorthHistory(
  userId: string,
): Promise<{ month: string; netWorth: number; assets: number }[]> {
  const snapshots = await prisma.monthlySnapshot.findMany({
    where: { userId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
    select: {
      year: true,
      month: true,
      netWorth: true,
      cumulativeSavings: true,
      investmentValue: true,
      jarsTotal: true,
      confirmedReturns: true,
    },
  });

  let runningCumulativeSavings = 0;
  return snapshots.map((s) => {
    runningCumulativeSavings += Math.max(0, toNum(s.cumulativeSavings));
    const assets =
      runningCumulativeSavings +
      toNum(s.investmentValue) +
      toNum(s.jarsTotal) +
      toNum(s.confirmedReturns);
    return {
      month: `${s.year}-${String(s.month).padStart(2, "0")}`,
      netWorth: toNum(s.netWorth) > 0 ? toNum(s.netWorth) : assets,
      assets,
    };
  });
}

export async function monthlyChangeBreakdown(
  userId: string,
  year: number,
  month: number,
): Promise<{
  monthlySavings: number;
  unspentCarryover: number;
  investmentGrowth: number;
  jarContributions: number;
  confirmedReturns: number;
  newLiabilities: number;
  netChange: number;
}> {
  const [income, expensesAgg, carryover, contributionsAgg, confirmedReturnsAgg] =
    await Promise.all([
      getIncomeForMonth(userId, year, month),
      prisma.expense.aggregate({
        where: {
          userId,
          occurredAt: {
            gte: startOfMonth(new Date(year, month - 1, 1)),
            lte: endOfMonth(new Date(year, month - 1, 1)),
          },
        },
        _sum: { amount: true },
      }),
      calculateUnspentCarryover(userId, year, month),
      prisma.jarContribution.aggregate({
        where: {
          jar: { userId },
          date: {
            gte: startOfMonth(new Date(year, month - 1, 1)),
            lte: endOfMonth(new Date(year, month - 1, 1)),
          },
        },
        _sum: { amount: true },
      }),
      prisma.investment.aggregate({
        where: {
          userId,
          status: "MATURED_CONFIRMED",
          profitConfirmedAt: {
            gte: startOfMonth(new Date(year, month - 1, 1)),
            lte: endOfMonth(new Date(year, month - 1, 1)),
          },
        },
        _sum: { actualProfit: true },
      }),
    ]);

  const monthlySavings = Math.max(0, income - toNum(expensesAgg._sum.amount));
  const jarContributions = toNum(contributionsAgg._sum.amount);
  const confirmedReturns = toNum(confirmedReturnsAgg._sum.actualProfit);
  const investmentGrowth = 0;
  const newLiabilities = 0;
  const netChange =
    monthlySavings +
    carryover +
    investmentGrowth +
    jarContributions +
    confirmedReturns -
    newLiabilities;

  return {
    monthlySavings,
    unspentCarryover: carryover,
    investmentGrowth,
    jarContributions,
    confirmedReturns,
    newLiabilities,
    netChange,
  };
}

export function firstMilestoneMonths(
  history: { month: string; netWorth: number }[],
  milestones: number[] = [1_000_000, 5_000_000, 10_000_000],
): Array<{ value: number; month: string }> {
  const out: Array<{ value: number; month: string }> = [];
  for (const milestone of milestones) {
    const hit = history.find((row) => row.netWorth >= milestone);
    if (hit) out.push({ value: milestone, month: hit.month });
  }
  return out;
}

export function previousMonthRef(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export async function getPreviousMonthNetWorth(
  userId: string,
  year: number,
  month: number,
): Promise<number | null> {
  const prev = previousMonthRef(year, month);
  const row = await prisma.monthlySnapshot.findUnique({
    where: {
      userId_year_month: {
        userId,
        year: prev.year,
        month: prev.month,
      },
    },
    select: { netWorth: true },
  });
  return row ? toNum(row.netWorth) : null;
}

export async function saveNetWorthSnapshot(
  userId: string,
  year: number,
  month: number,
): Promise<void> {
  const [current, carryover, previousNetWorth, monthlyChange] = await Promise.all([
    calculateCurrentNetWorth(userId),
    calculateUnspentCarryover(userId, year, month),
    getPreviousMonthNetWorth(userId, year, month),
    monthlyChangeBreakdown(userId, year, month),
  ]);

  await prisma.monthlySnapshot.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: {
      userId,
      year,
      month,
      totalIncome: new Prisma.Decimal(0),
      totalExpenses: new Prisma.Decimal(0),
      totalSaved: new Prisma.Decimal(0),
      cumulativeSavings: new Prisma.Decimal(current.cumulativeSavings),
      savingsRate: new Prisma.Decimal(0),
      expenseByCategory: {},
      investmentValue: new Prisma.Decimal(current.investmentPortfolio),
      tbillsValue: new Prisma.Decimal(0),
      risevest: new Prisma.Decimal(0),
      piggyvest: new Prisma.Decimal(0),
      ngx: new Prisma.Decimal(0),
      jarsTotal: new Prisma.Decimal(current.jarsTotal),
      confirmedReturns: new Prisma.Decimal(current.confirmedReturns),
      totalLiabilities: new Prisma.Decimal(current.totalLiabilities),
      netWorth: new Prisma.Decimal(current.netWorth),
      unspentCarryover: new Prisma.Decimal(carryover),
      monthlyNetChange: new Prisma.Decimal(
        previousNetWorth == null ? current.netWorth : current.netWorth - previousNetWorth,
      ),
      jarsProgress: Prisma.JsonNull,
      needsRecalculation: false,
    },
    update: {
      cumulativeSavings: new Prisma.Decimal(current.cumulativeSavings),
      investmentValue: new Prisma.Decimal(current.investmentPortfolio),
      jarsTotal: new Prisma.Decimal(current.jarsTotal),
      confirmedReturns: new Prisma.Decimal(current.confirmedReturns),
      totalLiabilities: new Prisma.Decimal(current.totalLiabilities),
      netWorth: new Prisma.Decimal(current.netWorth),
      unspentCarryover: new Prisma.Decimal(carryover),
      monthlyNetChange: new Prisma.Decimal(monthlyChange.netChange),
    },
  });
}

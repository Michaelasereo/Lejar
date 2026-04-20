import { prisma } from "@/lib/prisma";
import { projectWealthBars } from "@/lib/utils/projection";

function toNumber(v: { toString(): string } | number): number {
  if (typeof v === "number") return v;
  return parseFloat(v.toString());
}

export function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(monthKey: string): { y: number; m: number } | null {
  const [ys, ms] = monthKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m || m < 1 || m > 12) return null;
  return { y, m };
}

export function monthRange(monthKey: string): { start: Date; end: Date } | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  const { y, m } = parsed;
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

function monthsBetween(start: Date, end: Date): number {
  const a = start.getFullYear() * 12 + start.getMonth();
  const b = end.getFullYear() * 12 + end.getMonth();
  return Math.max(0, b - a);
}

export interface DashboardData {
  monthKey: string;
  totalIncome: number;
  savedThisMonth: number;
  spentThisMonth: number;
  savingsRatePercent: number;
  budgetTotal: number;
  buckets: Array<{
    id: string;
    name: string;
    color: string;
    allocated: number;
    spent: number;
  }>;
  rentJar: null | {
    annualRent: number;
    savedAmount: number;
    nextDueDate: Date;
    createdAt: Date;
    monthlyTarget: number;
    progressPercent: number;
    monthsToDue: number;
    onTrack: boolean;
  };
  pinnedJars: Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
    savedAmount: number;
    targetAmount: number;
    progressPercent: number;
    monthlyTarget: number;
    monthsToDue: number;
    onTrack: boolean;
    isCompleted: boolean;
  }>;
  portfolioTotal: number;
  investmentsByType: Record<string, number>;
  tbillsMaturingSoon: Array<{
    id: string;
    label: string;
    amount: number;
    maturityDate: Date;
  }>;
  recentExpenses: Array<{
    id: string;
    category: string;
    label: string | null;
    amount: number;
    occurredAt: Date;
  }>;
  wealthBars: { year: number; value: number }[];
  wealthFinalLine: string;
}

export async function getDashboardData(
  userId: string,
  monthKey: string,
): Promise<DashboardData | null> {
  const range = monthRange(monthKey);
  if (!range) return null;

  const [incomeSources, buckets, rentJar, pinnedJarRows, expenses, investments] =
    await Promise.all([
      prisma.incomeSource.findMany({ where: { userId } }),
      prisma.bucket.findMany({
        where: { userId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.rentJar.findUnique({ where: { userId } }),
      prisma.savingsJar.findMany({
        where: { userId, isPinned: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.expense.findMany({
        where: {
          userId,
          occurredAt: { gte: range.start, lte: range.end },
        },
        orderBy: { occurredAt: "desc" },
      }),
      prisma.investment.findMany({
        where: { userId, status: "ACTIVE" },
      }),
    ]);

  const totalIncome = incomeSources.reduce(
    (s, r) => s + toNumber(r.amountMonthly),
    0,
  );

  const budgetTotal = buckets.reduce(
    (s, b) => s + toNumber(b.allocatedAmount),
    0,
  );

  const spentThisMonth = expenses.reduce((s, e) => s + toNumber(e.amount), 0);

  const spentByBucket = new Map<string, number>();
  for (const e of expenses) {
    if (!e.bucketId) continue;
    spentByBucket.set(
      e.bucketId,
      (spentByBucket.get(e.bucketId) ?? 0) + toNumber(e.amount),
    );
  }

  const bucketRows = buckets.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    allocated: toNumber(b.allocatedAmount),
    spent: spentByBucket.get(b.id) ?? 0,
  }));

  const savedThisMonth = Math.max(0, totalIncome - spentThisMonth);

  const savingsRatePercent =
    totalIncome > 0 ? Math.round((savedThisMonth / totalIncome) * 1000) / 10 : 0;

  const portfolioTotal = investments.reduce((s, i) => s + toNumber(i.amount), 0);

  const investmentsByType: Record<string, number> = {};
  for (const inv of investments) {
    const t = inv.type;
    investmentsByType[t] = (investmentsByType[t] ?? 0) + toNumber(inv.amount);
  }

  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const tbillsMaturingSoon = investments
    .filter(
      (i) =>
        i.type === "T_BILL" &&
        i.maturityDate &&
        i.maturityDate > now &&
        i.maturityDate.getTime() - now.getTime() <= weekMs,
    )
    .map((i) => ({
      id: i.id,
      label: i.label,
      amount: toNumber(i.amount),
      maturityDate: i.maturityDate as Date,
    }));

  const recentExpenses = expenses.slice(0, 5).map((e) => ({
    id: e.id,
    category: e.category,
    label: e.label,
    amount: toNumber(e.amount),
    occurredAt: e.occurredAt,
  }));

  const monthlySavings = savedThisMonth;
  const wealthBars = projectWealthBars(monthlySavings, 0.2, [1, 2, 3, 5]);
  const fiveY = wealthBars.find((b) => b.year === 5)?.value ?? 0;
  const wealthFinalLine = `At your current rate, you'll have ${formatCompactNaira(fiveY)} in 5 years`;

  let rentOut: DashboardData["rentJar"] = null;
  if (rentJar) {
    const annualRent = toNumber(rentJar.annualRent);
    const savedAmount = toNumber(rentJar.savedAmount);
    const monthlyTarget = annualRent / 12;
    const monthsElapsed = monthsBetween(rentJar.createdAt, now) + 1;
    const expected = monthlyTarget * monthsElapsed;
    const onTrack = savedAmount >= expected;
    const progressPercent =
      annualRent > 0 ? Math.min(100, (savedAmount / annualRent) * 100) : 0;
    const nextDue = rentJar.nextDueDate;
    const monthsToDue = Math.max(
      0,
      Math.ceil(
        (nextDue.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24 * 30.44),
      ),
    );

    rentOut = {
      annualRent,
      savedAmount,
      nextDueDate: rentJar.nextDueDate,
      createdAt: rentJar.createdAt,
      monthlyTarget,
      progressPercent,
      monthsToDue,
      onTrack,
    };
  }

  const pinnedJars = pinnedJarRows.map((jar) => {
    const savedAmount = toNumber(jar.savedAmount);
    const targetAmount = toNumber(jar.targetAmount);
    const progressPercent =
      targetAmount > 0 ? Math.min(100, (savedAmount / targetAmount) * 100) : 0;
    const monthlyTargetNum =
      jar.monthlyTarget != null
        ? toNumber(jar.monthlyTarget)
        : targetAmount > 0
          ? targetAmount / 12
          : 0;
    const monthsElapsed = monthsBetween(jar.createdAt, now) + 1;
    const expected = monthlyTargetNum * monthsElapsed;
    const onTrack =
      monthlyTargetNum <= 0 ? true : savedAmount >= expected * 0.85;
    let monthsToDue = 0;
    if (jar.dueDate) {
      monthsToDue = Math.max(
        0,
        Math.ceil(
          (jar.dueDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24 * 30.44),
        ),
      );
    }
    return {
      id: jar.id,
      name: jar.name,
      emoji: jar.emoji,
      color: jar.color,
      savedAmount,
      targetAmount,
      progressPercent,
      monthlyTarget: monthlyTargetNum,
      monthsToDue,
      onTrack,
      isCompleted: jar.isCompleted,
    };
  });

  return {
    monthKey,
    totalIncome,
    savedThisMonth,
    spentThisMonth,
    savingsRatePercent,
    budgetTotal: budgetTotal > 0 ? budgetTotal : totalIncome,
    buckets: bucketRows,
    rentJar: rentOut,
    pinnedJars,
    portfolioTotal,
    investmentsByType,
    tbillsMaturingSoon,
    recentExpenses,
    wealthBars,
    wealthFinalLine,
  };
}

function formatCompactNaira(n: number): string {
  if (n >= 1_000_000) {
    return `₦${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `₦${Math.round(n / 1_000)}k`;
  }
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

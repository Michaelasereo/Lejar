import { endOfMonth, getISOWeek, getYear, startOfMonth, startOfWeek } from "date-fns";
import type { MilestoneType, StreakType, UserStreak } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getIncomeForMonth } from "@/lib/utils/income";

export function getCurrentWeekId(): string {
  const now = new Date();
  const week = getISOWeek(now);
  const year = getYear(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function getCurrentMonthId(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function previousWeekId(): string {
  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);
  return `${getYear(lastWeek)}-W${String(getISOWeek(lastWeek)).padStart(2, "0")}`;
}

function previousMonthId(year: number, month: number): string {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

function isConsecutiveWeek(lastPeriod: string | null): boolean {
  if (!lastPeriod) return false;
  return lastPeriod === previousWeekId();
}

function isConsecutiveMonth(lastPeriod: string | null, year: number, month: number): boolean {
  if (!lastPeriod) return false;
  return lastPeriod === previousMonthId(year, month);
}

async function upsertStreak(userId: string, type: StreakType): Promise<UserStreak> {
  return prisma.userStreak.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type },
    update: {},
  });
}

export async function evaluateStreaks(userId: string): Promise<void> {
  await Promise.all([evaluateWeeklyLoggingStreak(userId), evaluateMonthlyInvestingStreak(userId)]);
}

export async function evaluateWeeklyLoggingStreak(userId: string): Promise<void> {
  const currentWeekId = getCurrentWeekId();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const expenseThisWeek = await prisma.expense.findFirst({
    where: { userId, occurredAt: { gte: weekStart } },
    select: { id: true },
  });
  const streak = await upsertStreak(userId, "WEEKLY_LOGGING");
  if (!expenseThisWeek) return;
  if (streak.lastRecordedPeriod === currentWeekId) return;

  const consecutive = isConsecutiveWeek(streak.lastRecordedPeriod);
  const newCount = consecutive ? streak.currentCount + 1 : 1;
  const newLongest = Math.max(newCount, streak.longestCount);

  await prisma.userStreak.update({
    where: { userId_type: { userId, type: "WEEKLY_LOGGING" } },
    data: {
      currentCount: newCount,
      longestCount: newLongest,
      lastRecordedPeriod: currentWeekId,
      lastExtendedAt: new Date(),
      startedAt: consecutive ? streak.startedAt : new Date(),
    },
  });
}

export async function evaluateMonthlyInvestingStreak(userId: string): Promise<void> {
  const now = new Date();
  const monthId = getCurrentMonthId();
  const monthStart = startOfMonth(now);

  const investmentThisMonth = await prisma.investment.findFirst({
    where: {
      userId,
      OR: [{ investedAt: { gte: monthStart } }, { createdAt: { gte: monthStart } }],
    },
    select: { id: true },
  });
  const streak = await upsertStreak(userId, "MONTHLY_INVESTING");
  if (!investmentThisMonth) return;
  if (streak.lastRecordedPeriod === monthId) return;

  const consecutive = isConsecutiveMonth(
    streak.lastRecordedPeriod,
    now.getFullYear(),
    now.getMonth() + 1,
  );
  const newCount = consecutive ? streak.currentCount + 1 : 1;
  const newLongest = Math.max(newCount, streak.longestCount);

  await prisma.userStreak.update({
    where: { userId_type: { userId, type: "MONTHLY_INVESTING" } },
    data: {
      currentCount: newCount,
      longestCount: newLongest,
      lastRecordedPeriod: monthId,
      lastExtendedAt: new Date(),
      startedAt: consecutive ? streak.startedAt : new Date(),
    },
  });
}

export async function evaluateMonthlySavingsStreak(
  userId: string,
  year: number,
  month: number,
  totalIncome: number,
  totalSaved: number,
): Promise<number> {
  const monthId = `${year}-${String(month).padStart(2, "0")}`;
  const savingsRate = totalIncome > 0 ? totalSaved / totalIncome : 0;
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { targetSavingsRate: true },
  });
  const targetRate = (settings?.targetSavingsRate ?? 20) / 100;
  const hitTarget = savingsRate >= targetRate;

  const streak = await upsertStreak(userId, "MONTHLY_SAVINGS");
  if (streak.lastRecordedPeriod === monthId) return streak.currentCount;

  const consecutive = isConsecutiveMonth(streak.lastRecordedPeriod, year, month);
  const newCount = hitTarget ? (consecutive ? streak.currentCount + 1 : 1) : 0;
  const newLongest = Math.max(newCount, streak.longestCount);

  await prisma.userStreak.update({
    where: { userId_type: { userId, type: "MONTHLY_SAVINGS" } },
    data: {
      currentCount: newCount,
      longestCount: newLongest,
      lastRecordedPeriod: monthId,
      lastExtendedAt: hitTarget ? new Date() : streak.lastExtendedAt,
      startedAt: hitTarget && !consecutive ? new Date() : streak.startedAt,
    },
  });

  if (hitTarget) await checkStreakMilestones(userId, newCount);
  return newCount;
}

export async function evaluateMonthlyBudgetStreak(
  userId: string,
  year: number,
  month: number,
): Promise<number> {
  const monthId = `${year}-${String(month).padStart(2, "0")}`;
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));

  const [expenses, buckets, monthIncome] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, occurredAt: { gte: monthStart, lte: monthEnd } },
      select: { bucketId: true, amount: true },
    }),
    prisma.bucket.findMany({
      where: { userId },
      select: {
        id: true,
        allocatedAmount: true,
        percentage: true,
        allocations: { select: { percentage: true } },
      },
    }),
    getIncomeForMonth(userId, year, month),
  ]);

  const spentByBucket = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.bucketId) continue;
    spentByBucket.set(
      expense.bucketId,
      (spentByBucket.get(expense.bucketId) ?? 0) + Number(expense.amount),
    );
  }
  const respectedBudget = buckets.every(
    (bucket) => {
      const fallbackPercentage = bucket.allocations.reduce(
        (sum, row) => sum + (row.percentage ?? 0),
        0,
      );
      const percentage =
        typeof bucket.percentage === "number" ? bucket.percentage : fallbackPercentage;
      const allocated =
        percentage > 0
          ? Math.round((percentage / 100) * monthIncome)
          : Number(bucket.allocatedAmount);
      return (spentByBucket.get(bucket.id) ?? 0) <= allocated + 1e-9;
    },
  );

  const streak = await upsertStreak(userId, "MONTHLY_BUDGET");
  if (streak.lastRecordedPeriod === monthId) return streak.currentCount;

  const consecutive = isConsecutiveMonth(streak.lastRecordedPeriod, year, month);
  const newCount = respectedBudget ? (consecutive ? streak.currentCount + 1 : 1) : 0;
  const newLongest = Math.max(newCount, streak.longestCount);

  await prisma.userStreak.update({
    where: { userId_type: { userId, type: "MONTHLY_BUDGET" } },
    data: {
      currentCount: newCount,
      longestCount: newLongest,
      lastRecordedPeriod: monthId,
      lastExtendedAt: respectedBudget ? new Date() : streak.lastExtendedAt,
      startedAt: respectedBudget && !consecutive ? new Date() : streak.startedAt,
    },
  });

  if (newCount >= 3) {
    await prisma.userMilestone.upsert({
      where: {
        userId_type_value: { userId, type: "BUDGET_RESPECTED_3", value: 3 },
      },
      create: { userId, type: "BUDGET_RESPECTED_3", value: 3, isNew: true },
      update: {},
    });
  }

  return newCount;
}

async function checkStreakMilestones(userId: string, streakCount: number): Promise<void> {
  const milestoneMap: Record<number, MilestoneType> = {
    3: "SAVINGS_STREAK_3",
    6: "SAVINGS_STREAK_6",
    12: "SAVINGS_STREAK_12",
  };
  const milestone = milestoneMap[streakCount];
  if (!milestone) return;
  await prisma.userMilestone.upsert({
    where: {
      userId_type_value: { userId, type: milestone, value: streakCount },
    },
    create: { userId, type: milestone, value: streakCount, isNew: true },
    update: {},
  });
}

export async function checkNetWorthMilestones(
  userId: string,
  netWorth: number,
): Promise<Array<{ id: string; type: MilestoneType; value: number }>> {
  const thresholds: Array<{ value: number; type: MilestoneType }> = [
    { value: 500_000, type: "NET_WORTH_500K" },
    { value: 1_000_000, type: "NET_WORTH_1M" },
    { value: 5_000_000, type: "NET_WORTH_5M" },
    { value: 10_000_000, type: "NET_WORTH_10M" },
    { value: 50_000_000, type: "NET_WORTH_50M" },
    { value: 100_000_000, type: "NET_WORTH_100M" },
  ];
  const created: Array<{ id: string; type: MilestoneType; value: number }> = [];
  for (const threshold of thresholds) {
    if (netWorth < threshold.value) continue;
    const existing = await prisma.userMilestone.findUnique({
      where: {
        userId_type_value: {
          userId,
          type: threshold.type,
          value: threshold.value,
        },
      },
      select: { id: true },
    });
    if (existing) continue;
    const row = await prisma.userMilestone.create({
      data: {
        userId,
        type: threshold.type,
        value: threshold.value,
        isNew: true,
      },
      select: { id: true, type: true, value: true },
    });
    created.push({ id: row.id, type: row.type, value: row.value ?? threshold.value });
  }
  return created;
}

export interface StreakView {
  id: string;
  type: StreakType;
  currentCount: number;
  longestCount: number;
  lastRecordedPeriod: string | null;
  isActive: boolean;
  startedAt: Date | null;
  lastExtendedAt: Date | null;
  isAtRisk: boolean;
  daysUntilReset: number | null;
}

function isStreakAtRisk(streak: UserStreak): boolean {
  if (streak.currentCount === 0) return false;
  if (streak.type === "WEEKLY_LOGGING") return new Date().getDay() >= 4;
  if (streak.type.startsWith("MONTHLY")) return new Date().getDate() >= 20;
  return false;
}

function getDaysUntilReset(streak: UserStreak): number | null {
  if (streak.type === "WEEKLY_LOGGING") return 7 - new Date().getDay();
  if (streak.type.startsWith("MONTHLY")) {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  }
  return null;
}

export async function getUserStreaks(userId: string): Promise<StreakView[]> {
  const streaks = await prisma.userStreak.findMany({
    where: { userId, isActive: true },
    orderBy: [{ currentCount: "desc" }, { updatedAt: "desc" }],
  });
  return streaks.map((streak) => ({
    ...streak,
    isAtRisk: isStreakAtRisk(streak),
    daysUntilReset: getDaysUntilReset(streak),
  }));
}

export async function ensureWeeklyLoggingGraceWarning(userId: string): Promise<void> {
  const today = new Date();
  const isSunday = today.getDay() === 0;
  if (!isSunday) return;

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const hasExpense = await prisma.expense.findFirst({
    where: { userId, occurredAt: { gte: weekStart } },
    select: { id: true },
  });
  if (hasExpense) return;

  const streak = await prisma.userStreak.findUnique({
    where: { userId_type: { userId, type: "WEEKLY_LOGGING" } },
  });
  if (!streak || streak.currentCount <= 0) return;

  const expiresAt = new Date(today);
  expiresAt.setHours(23, 59, 59, 999);

  const existing = await prisma.streakWarning.findFirst({
    where: {
      userId,
      streakType: "WEEKLY_LOGGING",
      isDismissed: false,
      expiresAt: { gte: today },
    },
    select: { id: true },
  });
  if (existing) return;

  await prisma.streakWarning.create({
    data: {
      userId,
      streakType: "WEEKLY_LOGGING",
      message: `Your ${streak.currentCount}-week logging streak ends tonight - log an expense to keep it.`,
      expiresAt,
    },
  });
}

export async function maybeCreateFirstInvestmentMilestones(
  userId: string,
  type: string,
): Promise<void> {
  await prisma.userMilestone.upsert({
    where: { userId_type_value: { userId, type: "FIRST_INVESTMENT", value: 1 } },
    create: { userId, type: "FIRST_INVESTMENT", value: 1, isNew: true },
    update: {},
  });
  if (type === "T_BILL") {
    await prisma.userMilestone.upsert({
      where: { userId_type_value: { userId, type: "FIRST_TBILL", value: 1 } },
      create: { userId, type: "FIRST_TBILL", value: 1, isNew: true },
      update: {},
    });
  }
}

export async function getMonthlySavingsInput(
  userId: string,
  year: number,
  month: number,
): Promise<{ totalIncome: number; totalSaved: number }> {
  const income = await getIncomeForMonth(userId, year, month);
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(new Date(year, month - 1, 1));
  const expenses = await prisma.expense.aggregate({
    where: { userId, occurredAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const totalSaved = Math.max(0, income - Number(expenses._sum.amount ?? 0));
  return { totalIncome: income, totalSaved };
}

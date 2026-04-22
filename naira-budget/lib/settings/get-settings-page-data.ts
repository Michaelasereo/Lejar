import { prisma } from "@/lib/prisma";
import { toIncomeRangeLabel } from "@/lib/utils/income";

export interface SettingsPageData {
  email: string;
  userId: string;
  isOnboarded: boolean;
  settingsCreatedAt: Date | null;
  targetSavingsRate: number;
  currentIncome: Array<{ id: string; label: string; amountMonthly: number }>;
  incomeHistory: Array<{
    id: string;
    label: string;
    amountMonthly: number;
    rangeLabel: string;
    isCurrent: boolean;
  }>;
  buckets: Array<{
    id: string;
    name: string;
    color: string;
    percentage: number;
    allocationPercentage: number;
  }>;
}

export async function getSettingsPageData(userId: string, email: string): Promise<SettingsPageData> {
  const [settings, incomes, buckets] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId },
      select: { isOnboarded: true, createdAt: true, targetSavingsRate: true },
    }),
    prisma.incomeSource.findMany({
      where: { userId, isActive: true },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.bucket.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        percentage: true,
        allocations: { select: { percentage: true } },
      },
    }),
  ]);

  return {
    email,
    userId,
    isOnboarded: settings?.isOnboarded ?? false,
    settingsCreatedAt: settings?.createdAt ?? null,
    targetSavingsRate: settings?.targetSavingsRate ?? 20,
    currentIncome: incomes
      .filter((income) => income.effectiveTo === null)
      .map((income) => ({
        id: income.id,
        label: income.label,
        amountMonthly: Number(income.amountMonthly),
      })),
    incomeHistory: incomes.map((income) => ({
      id: income.id,
      label: income.label,
      amountMonthly: Number(income.amountMonthly),
      rangeLabel: toIncomeRangeLabel(income.effectiveFrom, income.effectiveTo),
      isCurrent: income.effectiveTo === null,
    })),
    buckets: buckets.map((bucket) => {
      const allocationPercentage = bucket.allocations.reduce(
        (sum, row) => sum + (row.percentage ?? 0),
        0,
      );
      return {
        id: bucket.id,
        name: bucket.name,
        color: bucket.color,
        percentage:
          typeof bucket.percentage === "number"
            ? bucket.percentage
            : allocationPercentage,
        allocationPercentage,
      };
    }),
  };
}

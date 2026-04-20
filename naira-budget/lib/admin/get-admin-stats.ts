import { prisma } from "@/lib/prisma";

export interface AdminStats {
  userSettingsCount: number;
  incomeSourceCount: number;
  bucketCount: number;
  expenseCount: number;
  investmentCount: number;
  groceryItemCount: number;
  rentJarCount: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [
    userSettingsCount,
    incomeSourceCount,
    bucketCount,
    expenseCount,
    investmentCount,
    groceryItemCount,
    rentJarCount,
  ] = await Promise.all([
    prisma.userSettings.count(),
    prisma.incomeSource.count(),
    prisma.bucket.count(),
    prisma.expense.count(),
    prisma.investment.count(),
    prisma.groceryItem.count(),
    prisma.rentJar.count(),
  ]);

  return {
    userSettingsCount,
    incomeSourceCount,
    bucketCount,
    expenseCount,
    investmentCount,
    groceryItemCount,
    rentJarCount,
  };
}

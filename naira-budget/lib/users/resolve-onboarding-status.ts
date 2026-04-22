import { prisma } from "@/lib/prisma";

/**
 * Keeps pre-existing users out of onboarding after domain/auth migrations.
 * If legacy financial records exist, we treat the account as onboarded and
 * backfill `UserSettings.isOnboarded`.
 */
export async function resolveOnboardingStatus(userId: string): Promise<boolean> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { isOnboarded: true },
  });

  if (settings?.isOnboarded) {
    return true;
  }

  const [income, bucket, expense, investment, savingsJar] = await Promise.all([
    prisma.incomeSource.findFirst({ where: { userId }, select: { id: true } }),
    prisma.bucket.findFirst({ where: { userId }, select: { id: true } }),
    prisma.expense.findFirst({ where: { userId }, select: { id: true } }),
    prisma.investment.findFirst({ where: { userId }, select: { id: true } }),
    prisma.savingsJar.findFirst({ where: { userId }, select: { id: true } }),
  ]);

  const hasLegacyData = Boolean(income || bucket || expense || investment || savingsJar);
  if (!hasLegacyData) {
    return false;
  }

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, isOnboarded: true },
    update: { isOnboarded: true },
  });

  return true;
}

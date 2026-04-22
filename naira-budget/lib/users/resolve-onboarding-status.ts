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

  const [
    income,
    bucket,
    allocation,
    expense,
    investment,
    savingsJar,
    rentJar,
    incomeOverride,
    monthlySnapshot,
    liability,
    groupMember,
    groupContribution,
  ] = await Promise.all([
    prisma.incomeSource.findFirst({ where: { userId }, select: { id: true } }),
    prisma.bucket.findFirst({ where: { userId }, select: { id: true } }),
    prisma.bucketAllocation.findFirst({
      where: { bucket: { userId } },
      select: { id: true },
    }),
    prisma.expense.findFirst({ where: { userId }, select: { id: true } }),
    prisma.investment.findFirst({ where: { userId }, select: { id: true } }),
    prisma.savingsJar.findFirst({ where: { userId }, select: { id: true } }),
    prisma.rentJar.findUnique({ where: { userId }, select: { id: true } }),
    prisma.monthlyIncomeOverride.findFirst({ where: { userId }, select: { id: true } }),
    prisma.monthlySnapshot.findFirst({ where: { userId }, select: { id: true } }),
    prisma.userLiability.findUnique({ where: { userId }, select: { id: true } }),
    prisma.groupJarMember.findFirst({ where: { userId }, select: { id: true } }),
    prisma.groupJarContribution.findFirst({
      where: { member: { userId } },
      select: { id: true },
    }),
  ]);

  const hasLegacyData = Boolean(
    income ||
      bucket ||
      allocation ||
      expense ||
      investment ||
      savingsJar ||
      rentJar ||
      incomeOverride ||
      monthlySnapshot ||
      liability ||
      groupMember ||
      groupContribution,
  );
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

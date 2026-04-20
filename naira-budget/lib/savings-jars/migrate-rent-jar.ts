import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

/** One-time migration from legacy RentJar → SavingsJar (category RENT). Idempotent. */
export async function migrateRentJarToSavingsJar(
  prisma: PrismaClient,
  userId: string,
): Promise<{ created: boolean; jarId: string | null }> {
  const rent = await prisma.rentJar.findUnique({ where: { userId } });
  if (!rent) {
    return { created: false, jarId: null };
  }

  const existing = await prisma.savingsJar.findFirst({
    where: {
      userId,
      category: "RENT",
      name: "Rent",
    },
  });
  if (existing) {
    return { created: false, jarId: existing.id };
  }

  const annual = rent.annualRent;
  const monthlyTarget = annual.div(new Prisma.Decimal(12));

  const jar = await prisma.savingsJar.create({
    data: {
      userId,
      name: "Rent",
      emoji: "🏠",
      category: "RENT",
      targetAmount: annual,
      savedAmount: rent.savedAmount,
      monthlyTarget,
      dueDate: rent.nextDueDate,
      color: "#16a34a",
      isPinned: true,
      notes: "Migrated from legacy rent jar",
    },
  });

  return { created: true, jarId: jar.id };
}

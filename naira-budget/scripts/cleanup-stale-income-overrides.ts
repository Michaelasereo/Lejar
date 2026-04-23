import { endOfMonth, startOfMonth } from "date-fns";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }
  return { year, month };
}

async function run() {
  const overrides = await prisma.monthlyIncomeOverride.findMany({
    where: { note: { startsWith: "Includes " } },
    select: { id: true, userId: true, monthKey: true, note: true },
  });

  let deleted = 0;
  for (const override of overrides) {
    const { year, month } = parseMonthKey(override.monthKey);
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(new Date(year, month - 1, 1));

    const overlapCount = await prisma.incomeSource.count({
      where: {
        userId: override.userId,
        isActive: true,
        effectiveFrom: { lte: monthEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthStart } }],
      },
    });

    if (overlapCount > 0) {
      await prisma.monthlyIncomeOverride.delete({ where: { id: override.id } });
      deleted += 1;
      console.log(`Deleted override ${override.id} (${override.monthKey})`);
    }
  }

  console.log(`Finished. Deleted ${deleted} stale overrides.`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

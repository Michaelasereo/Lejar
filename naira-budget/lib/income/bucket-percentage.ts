import { prisma } from "@/lib/prisma";

export const PERCENTAGE_TOLERANCE = 0.01;

export function normalizePercentage(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function isPercentageClose(a: number, b: number, tolerance = PERCENTAGE_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

export async function getBucketAllocationPercentage(bucketId: string): Promise<number> {
  const agg = await prisma.bucketAllocation.aggregate({
    where: { bucketId },
    _sum: { percentage: true },
  });
  return normalizePercentage(agg._sum.percentage ?? 0);
}

export async function getUserBucketPercentageTotal(
  userId: string,
  excludeBucketId?: string,
): Promise<number> {
  const rows = await prisma.bucket.findMany({
    where: {
      userId,
      ...(excludeBucketId ? { id: { not: excludeBucketId } } : {}),
    },
    select: { percentage: true },
  });
  return normalizePercentage(
    rows.reduce((sum, row) => sum + (typeof row.percentage === "number" ? row.percentage : 0), 0),
  );
}

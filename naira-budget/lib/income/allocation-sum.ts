import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/income/money";

/** Sum of allocation amounts for a bucket, optionally excluding one row (for PATCH). */
export async function sumAllocationsForBucket(
  bucketId: string,
  excludeId?: string,
): Promise<number> {
  const rows = await prisma.bucketAllocation.findMany({ where: { bucketId } });
  let s = 0;
  for (const r of rows) {
    if (excludeId && r.id === excludeId) continue;
    s += toNumber(r.amount);
  }
  return s;
}

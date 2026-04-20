import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/income/money";

export interface GroceryItemRecord {
  id: string;
  label: string;
  quantity: string | null;
  estimatedPrice: number | null;
  isPurchased: boolean;
  sortOrder: number;
}

export interface GroceryPageData {
  items: GroceryItemRecord[];
  pricedTotal: number;
  pricedCount: number;
  deferredCount: number;
}

export async function getGroceryPageData(userId: string): Promise<GroceryPageData> {
  const rows = await prisma.groceryItem.findMany({
    where: { userId },
    orderBy: [{ isPurchased: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const items: GroceryItemRecord[] = rows.map((r) => ({
    id: r.id,
    label: r.label,
    quantity: r.quantity,
    estimatedPrice: r.estimatedPrice === null ? null : toNumber(r.estimatedPrice),
    isPurchased: r.isPurchased,
    sortOrder: r.sortOrder,
  }));

  let pricedTotal = 0;
  let pricedCount = 0;
  let deferredCount = 0;

  for (const r of rows) {
    if (r.estimatedPrice === null) {
      deferredCount += 1;
    } else {
      pricedCount += 1;
      if (!r.isPurchased) {
        pricedTotal += toNumber(r.estimatedPrice);
      }
    }
  }

  return { items, pricedTotal, pricedCount, deferredCount };
}

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/income/money";

export interface GroceryItemRecord {
  id: string;
  label: string;
  quantity: string | null;
  estimatedPrice: number | null;
  isPurchased: boolean;
  movedToExpenses: boolean;
  movedToExpensesAt: Date | null;
  sortOrder: number;
}

export interface GroceryPageData {
  items: GroceryItemRecord[];
  pricedTotal: number;
  pricedCount: number;
  deferredCount: number;
  checkedPricedCount: number;
  checkedPricedTotal: number;
  checkedNoPriceCount: number;
  loggedCount: number;
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
    movedToExpenses: r.movedToExpenses,
    movedToExpensesAt: r.movedToExpensesAt,
    sortOrder: r.sortOrder,
  }));

  let pricedTotal = 0;
  let pricedCount = 0;
  let deferredCount = 0;
  let checkedPricedCount = 0;
  let checkedPricedTotal = 0;
  let checkedNoPriceCount = 0;
  let loggedCount = 0;

  for (const r of rows) {
    if (r.estimatedPrice === null) {
      deferredCount += 1;
      if (r.isPurchased) checkedNoPriceCount += 1;
    } else {
      pricedCount += 1;
      if (!r.isPurchased) {
        pricedTotal += toNumber(r.estimatedPrice);
      }
      if (r.isPurchased) {
        checkedPricedCount += 1;
        checkedPricedTotal += toNumber(r.estimatedPrice);
      }
    }

    if (r.movedToExpenses) {
      loggedCount += 1;
    }
  }

  return {
    items,
    pricedTotal,
    pricedCount,
    deferredCount,
    checkedPricedCount,
    checkedPricedTotal,
    checkedNoPriceCount,
    loggedCount,
  };
}

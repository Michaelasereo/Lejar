export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function percentageToAmount(percentage: number, totalIncome: number): number {
  return Math.round((percentage / 100) * totalIncome);
}

export function amountToPercentage(amount: number, totalIncome: number): number {
  if (totalIncome === 0) return 0;
  return Math.round((amount / totalIncome) * 10000) / 100;
}

export function recalculateAllocations(
  allocations: { id: string; percentage: number }[],
  newTotalIncome: number,
): { id: string; amount: number }[] {
  return allocations.map((a) => ({
    id: a.id,
    amount: percentageToAmount(a.percentage, newTotalIncome),
  }));
}

export function balanceAmountsToTotal<T extends { amount: number }>(
  items: T[],
  total: number,
): T[] {
  if (items.length === 0) return [];
  const target = Math.round(total);
  const normalized = items.map((item) => ({
    ...item,
    amount: Math.max(0, Math.round(item.amount)),
  }));
  const current = normalized.reduce((sum, item) => sum + item.amount, 0);
  const drift = target - current;
  if (drift === 0) return normalized;

  let adjustIndex = 0;
  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i]!.amount > normalized[adjustIndex]!.amount) {
      adjustIndex = i;
    }
  }

  const adjusted = normalized[adjustIndex]!;
  adjusted.amount = Math.max(0, adjusted.amount + drift);
  return normalized;
}

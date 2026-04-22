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

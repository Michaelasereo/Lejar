import type { InvestmentStatus } from "@prisma/client";

export function calculateTBillReturn(
  principal: number,
  annualRatePercent: number,
  days: number,
): number {
  if (principal <= 0 || annualRatePercent <= 0 || days <= 0) return 0;
  const annualRate = annualRatePercent / 100;
  return principal * annualRate * (days / 365);
}

export function shouldShowProfitConfirmation(
  maturityDate: Date,
  status: InvestmentStatus,
): boolean {
  return status === "MATURED" && new Date() >= maturityDate;
}

export function daysSinceMaturity(maturityDate: Date): number {
  return Math.floor((Date.now() - maturityDate.getTime()) / 86400000);
}

/** Must stay aligned with dashboard filters (e.g. T_BILL maturities). */
export const INVESTMENT_TYPES = [
  { value: "T_BILL", label: "T-Bill / FGN" },
  { value: "FIXED_DEPOSIT", label: "Fixed deposit" },
  { value: "MUTUAL_FUND", label: "Mutual fund" },
  { value: "STOCKS", label: "Stocks" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "REAL_ESTATE", label: "Real estate" },
  { value: "OTHER", label: "Other" },
] as const;

export type InvestmentTypeValue = (typeof INVESTMENT_TYPES)[number]["value"];

export const INVESTMENT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "MATURED", label: "Matured" },
  { value: "MATURED_CONFIRMED", label: "Confirmed" },
  { value: "ROLLED_OVER", label: "Rolled over" },
  { value: "WITHDRAWN", label: "Withdrawn" },
] as const;

export function investmentTypeLabel(value: string): string {
  const row = INVESTMENT_TYPES.find((t) => t.value === value);
  return row?.label ?? value;
}

export function investmentStatusLabel(value: string): string {
  const row = INVESTMENT_STATUSES.find((s) => s.value === value);
  return row?.label ?? value;
}

/** Preset bucket colors (same palette as onboarding). */
export const BUCKET_COLORS = [
  "#16a34a",
  "#2563eb",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#64748b",
] as const;

export const ALLOCATION_PLATFORMS = [
  { value: "PIGGYVEST", label: "PiggyVest" },
  { value: "COWRYWISE", label: "Cowrywise" },
  { value: "OPAY", label: "OPay" },
  { value: "PALMPAY", label: "PalmPay" },
  { value: "GTB", label: "GTBank" },
  { value: "OTHER", label: "Other" },
] as const;

export type AllocationPlatform = (typeof ALLOCATION_PLATFORMS)[number]["value"];

export const ALLOCATION_TYPES = [
  { value: "SAVINGS", label: "Savings" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "SPENDING", label: "Spending" },
] as const;

export type AllocationType = (typeof ALLOCATION_TYPES)[number]["value"];

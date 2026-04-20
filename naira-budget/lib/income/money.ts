import { Prisma } from "@prisma/client";

/** Parse user-entered amount strings (commas allowed). */
export function parseAmountInput(s: string): number {
  const n = parseFloat(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function toNumber(v: { toString(): string } | number): number {
  if (typeof v === "number") return v;
  return parseFloat(v.toString());
}

export function decimalsEqual(a: number, b: number, eps = 0.005): boolean {
  return Math.abs(a - b) < eps;
}

export function toDecimal(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

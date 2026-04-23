import { z } from "zod";

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format");

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const finiteMoneySchema = z
  .number()
  .finite("Amount must be a valid number")
  .max(1_000_000_000, "Amount is too large");

export const positiveMoneySchema = finiteMoneySchema.positive("Amount must be greater than zero");
export const nonNegativeMoneySchema = finiteMoneySchema.nonnegative("Amount cannot be negative");

export const percentageSchema = z
  .number()
  .finite("Percentage must be a valid number")
  .min(0)
  .max(100);


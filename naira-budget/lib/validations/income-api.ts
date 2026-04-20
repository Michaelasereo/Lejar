import { z } from "zod";

const platform = z.enum([
  "PIGGYVEST",
  "COWRYWISE",
  "OPAY",
  "PALMPAY",
  "GTB",
  "OTHER",
]);

const allocationType = z.enum(["SAVINGS", "INVESTMENT", "SPENDING"]);

export const createIncomeSchema = z.object({
  label: z.string().min(1).max(120),
  amountMonthly: z.number().positive().finite(),
});

export const updateIncomeSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  amountMonthly: z.number().positive().finite().optional(),
});

export const createBucketSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  allocatedAmount: z.number().nonnegative().finite(),
});

export const updateBucketSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  allocatedAmount: z.number().nonnegative().finite().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createAllocationSchema = z.object({
  label: z.string().min(1).max(120),
  amount: z.number().positive().finite(),
  platform,
  allocationType,
});

export const updateAllocationSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  amount: z.number().positive().finite().optional(),
  platform: platform.optional(),
  allocationType: allocationType.optional(),
});

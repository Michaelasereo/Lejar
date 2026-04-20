import { z } from "zod";

export const analyticsQuerySchema = z.object({
  range: z.enum(["monthly", "quarterly", "annual", "all", "custom"]).default("monthly"),
  month: z.string().optional(),
  year: z.coerce.number().optional(),
  quarter: z.coerce.number().min(1).max(4).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

export const analyticsSnapshotBodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

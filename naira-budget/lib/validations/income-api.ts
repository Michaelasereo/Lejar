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

const incomeAllocationDirectiveSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("ADJUST_EXISTING"),
  }),
  z.object({
    mode: z.literal("NEW_BUCKET"),
    bucketName: z.string().min(1).max(80),
    bucketColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
]);

export const createIncomeSchema = z
  .object({
    label: z.string().min(1).max(120),
    amountMonthly: z.number().positive().finite(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    incomeTiming: z.enum(["MONTH_ONLY", "RECURRING", "DURATION"]).default("RECURRING"),
    monthOnlyStorageMode: z.enum(["OVERRIDE", "BOUNDED_SOURCE"]).optional(),
    effectiveTo: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    allocationDirective: incomeAllocationDirectiveSchema.default({ mode: "ADJUST_EXISTING" }),
  })
  .superRefine((data, ctx) => {
    if (data.incomeTiming === "MONTH_ONLY" && !data.monthOnlyStorageMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monthOnlyStorageMode"],
        message: "monthOnlyStorageMode is required for month-only income.",
      });
    }
    if (data.incomeTiming === "DURATION" && !data.effectiveTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effectiveTo"],
        message: "effectiveTo is required for duration income.",
      });
    }
  });

export const updateIncomeSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  amountMonthly: z.number().positive().finite().optional(),
  effectiveMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  isBackdate: z.boolean().optional(),
});

export const createBucketSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  allocatedAmount: z.number().nonnegative().finite().optional(),
  percentage: z.number().min(0).max(100).finite().optional(),
}).refine((data) => data.allocatedAmount !== undefined || data.percentage !== undefined, {
  message: "allocatedAmount or percentage is required",
});

export const updateBucketSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  allocatedAmount: z.number().nonnegative().finite().optional(),
  percentage: z.number().min(0).max(100).finite().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const monthlyIncomeOverrideSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().nonnegative().finite(),
  note: z.string().trim().max(240).optional(),
});

export const createAllocationSchema = z.object({
  label: z.string().min(1).max(120),
  amount: z.number().positive().finite().optional(),
  percentage: z.number().min(0).max(100).finite().optional(),
  platform,
  allocationType,
});

export const updateAllocationSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  amount: z.number().positive().finite().optional(),
  percentage: z.number().min(0).max(100).finite().optional(),
  platform: platform.optional(),
  allocationType: allocationType.optional(),
});

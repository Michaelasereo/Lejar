import { z } from "zod";
import {
  monthKeySchema,
  nonNegativeMoneySchema,
  percentageSchema,
  positiveMoneySchema,
} from "@/lib/validations/common";

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
    mode: z.literal("SINGLE_BUCKET"),
    bucketId: z.string().min(1),
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
    amountMonthly: positiveMoneySchema,
    effectiveFrom: monthKeySchema.optional(),
    incomeTiming: z.enum(["MONTH_ONLY", "RECURRING", "DURATION"]).default("RECURRING"),
    monthOnlyStorageMode: z.enum(["OVERRIDE", "BOUNDED_SOURCE"]).optional(),
    effectiveTo: monthKeySchema.optional(),
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
  amountMonthly: positiveMoneySchema.optional(),
  effectiveMonth: monthKeySchema.optional(),
  isBackdate: z.boolean().optional(),
});

export const createBucketSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  allocatedAmount: nonNegativeMoneySchema.optional(),
  percentage: percentageSchema.optional(),
}).refine((data) => data.allocatedAmount !== undefined || data.percentage !== undefined, {
  message: "allocatedAmount or percentage is required",
});

export const updateBucketSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  allocatedAmount: nonNegativeMoneySchema.optional(),
  percentage: percentageSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const monthlyIncomeOverrideSchema = z.object({
  monthKey: monthKeySchema,
  amount: nonNegativeMoneySchema,
  note: z.string().trim().max(240).optional(),
});

export const createAllocationSchema = z.object({
  label: z.string().min(1).max(120),
  amount: positiveMoneySchema.optional(),
  percentage: percentageSchema.optional(),
  platform,
  allocationType,
});

export const updateAllocationSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  amount: positiveMoneySchema.optional(),
  percentage: percentageSchema.optional(),
  platform: platform.optional(),
  allocationType: allocationType.optional(),
});

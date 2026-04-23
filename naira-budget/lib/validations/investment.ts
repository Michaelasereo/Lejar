import { z } from "zod";
import {
  isoDateSchema,
  nonNegativeMoneySchema,
  positiveMoneySchema,
} from "@/lib/validations/common";

const investmentTypeEnum = z.enum([
  "T_BILL",
  "FIXED_DEPOSIT",
  "MUTUAL_FUND",
  "STOCKS",
  "CRYPTO",
  "REAL_ESTATE",
  "OTHER",
]);

const statusEnum = z.enum([
  "ACTIVE",
  "MATURED",
  "MATURED_CONFIRMED",
  "ROLLED_OVER",
  "WITHDRAWN",
]);

export const createInvestmentSchema = z
  .object({
    type: investmentTypeEnum,
    label: z.string().min(1).max(120),
    amount: positiveMoneySchema,
    investedAt: isoDateSchema,
    maturityDate: z.string().optional().nullable(),
    expectedProfit: nonNegativeMoneySchema.optional().nullable(),
    status: statusEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "T_BILL" && (!data.maturityDate || data.maturityDate.trim() === "")) {
      ctx.addIssue({
        code: "custom",
        message: "T-Bills need a maturity date",
        path: ["maturityDate"],
      });
    }
  });

export type CreateInvestmentFormValues = z.infer<typeof createInvestmentSchema>;

export const updateInvestmentSchema = z.object({
  type: investmentTypeEnum.optional(),
  label: z.string().min(1).max(120).optional(),
  amount: positiveMoneySchema.optional(),
  investedAt: isoDateSchema.optional(),
  maturityDate: z.union([z.string(), z.null()]).optional(),
  expectedProfit: nonNegativeMoneySchema.nullable().optional(),
  status: statusEnum.optional(),
});

export const confirmInvestmentProfitSchema = z.object({
  actualProfit: nonNegativeMoneySchema,
  notes: z.string().max(250).optional(),
});

import { z } from "zod";

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
    amount: z.number().positive("Amount must be greater than zero"),
    investedAt: z.string().min(1, "Pick an investment date"),
    maturityDate: z.string().optional().nullable(),
    expectedProfit: z.number().nonnegative().optional().nullable(),
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
  amount: z.number().positive().finite().optional(),
  investedAt: z.string().optional(),
  maturityDate: z.union([z.string(), z.null()]).optional(),
  expectedProfit: z.number().nonnegative().nullable().optional(),
  status: statusEnum.optional(),
});

export const confirmInvestmentProfitSchema = z.object({
  actualProfit: z.number().nonnegative(),
  notes: z.string().max(250).optional(),
});

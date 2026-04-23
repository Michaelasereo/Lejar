import { z } from "zod";
import { isoDateSchema, positiveMoneySchema } from "@/lib/validations/common";

const expenseCategoryEnum = z.enum([
  "FOOD",
  "TRANSPORT",
  "UTILITIES",
  "HOUSING",
  "HEALTH",
  "GIFT",
  "ENTERTAINMENT",
  "SUBSCRIPTIONS",
  "SHOPPING",
  "TRANSFERS",
  "OTHER",
]);

export const createExpenseSchema = z.object({
  amount: positiveMoneySchema,
  category: expenseCategoryEnum,
  label: z.string().max(120).optional(),
  bucketId: z.string().min(1),
  occurredAt: isoDateSchema,
});

export const updateExpenseSchema = z.object({
  amount: positiveMoneySchema.optional(),
  category: expenseCategoryEnum.optional(),
  label: z.union([z.string().max(120), z.null()]).optional(),
  bucketId: z.string().min(1).optional(),
  occurredAt: isoDateSchema.optional(),
});

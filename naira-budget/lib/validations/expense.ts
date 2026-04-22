import { z } from "zod";

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
  amount: z.number().positive().finite(),
  category: expenseCategoryEnum,
  label: z.string().max(120).optional(),
  bucketId: z.string().min(1),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
});

export const updateExpenseSchema = z.object({
  amount: z.number().positive().finite().optional(),
  category: expenseCategoryEnum.optional(),
  label: z.union([z.string().max(120), z.null()]).optional(),
  bucketId: z.string().min(1).optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

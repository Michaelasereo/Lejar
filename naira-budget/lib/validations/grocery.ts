import { z } from "zod";

export const createGroceryItemSchema = z.object({
  label: z.string().min(1).max(120),
  quantity: z.string().max(40).optional(),
  estimatedPrice: z.number().nonnegative().finite().optional(),
});

export const updateGroceryItemSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  quantity: z.union([z.string().max(40), z.null()]).optional(),
  estimatedPrice: z.union([z.number().nonnegative().finite(), z.null()]).optional(),
  isPurchased: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const logSelectedGroceryItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
  category: z.enum([
    "FOOD",
    "TRANSPORT",
    "UTILITIES",
    "HOUSING",
    "HEALTH",
    "ENTERTAINMENT",
    "SUBSCRIPTIONS",
    "SHOPPING",
    "TRANSFERS",
    "OTHER",
  ]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
  label: z.string().min(1).max(120),
  note: z.string().max(250).optional(),
});

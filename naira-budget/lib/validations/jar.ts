import { z } from "zod";

export const jarCategorySchema = z.enum([
  "RENT",
  "EMERGENCY_FUND",
  "GADGET",
  "TRAVEL",
  "EDUCATION",
  "INVESTMENT_CAPITAL",
  "BUSINESS",
  "CELEBRATION",
  "OTHER",
]);

export const createJarSchema = z.object({
  name: z.string().min(1).max(120),
  emoji: z.string().max(8).optional(),
  targetAmount: z.number().positive().finite(),
  monthlyTarget: z.number().nonnegative().finite().nullable().optional(),
  dueDate: z.string().min(1).nullable().optional(),
  color: z.string().max(32).optional(),
  category: jarCategorySchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
  isPinned: z.boolean().optional(),
});

export const patchJarSchema = createJarSchema.partial().extend({
  savedAmount: z.number().nonnegative().finite().optional(),
  isCompleted: z.boolean().optional(),
});

export const contributionSchema = z.object({
  amount: z.number().positive().finite(),
  note: z.string().max(500).nullable().optional(),
  date: z.string().min(1).optional(),
});

export const createGroupJarSchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().default("🏦"),
  targetAmount: z.number().positive(),
  dueDate: z.string().datetime().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  notes: z.string().max(200).optional(),
  inviteEmails: z.array(z.string().email()).max(10).default([]),
});

export const patchGroupJarSchema = z
  .object({
    name: z.string().min(1).max(50),
    emoji: z.string(),
    targetAmount: z.number().positive(),
    dueDate: z.string().datetime().nullable(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    notes: z.string().max(200).nullable(),
    isCompleted: z.boolean(),
  })
  .partial();

export const groupContributeSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.string().datetime().optional(),
});

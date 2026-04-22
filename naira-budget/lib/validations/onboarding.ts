import { z } from "zod";

export const onboardingApiSchema = z.object({
  incomeSources: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        amount: z.number().positive(),
      }),
    )
    .min(1),
  rentSkipped: z.boolean(),
  rent: z
    .object({
      annualAmount: z.number().nonnegative(),
      nextDueDate: z.string().min(1),
    })
    .nullable(),
  buckets: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        color: z.string().min(1),
        percentage: z.number().min(0).max(100),
        amount: z.number().nonnegative(),
      }),
    )
    .min(1),
});

export type OnboardingApiPayload = z.infer<typeof onboardingApiSchema>;

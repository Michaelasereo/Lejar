import { z } from "zod";

export const sendCodeSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  purpose: z.enum(["signup", "login"]),
  fullName: z.string().trim().min(1).max(120).optional(),
});

export const verifyCodeSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  purpose: z.enum(["signup", "login"]),
  password: z.string().min(8).optional(),
  fullName: z.string().trim().min(1).max(120).optional(),
});

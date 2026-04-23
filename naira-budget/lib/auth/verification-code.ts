import crypto from "node:crypto";
import { VerificationCodePurpose } from "@prisma/client";

const VERIFICATION_CODE_LENGTH = 6;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateVerificationCode(length = VERIFICATION_CODE_LENGTH): string {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(length, "0");
}

export function hashVerificationCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function verificationPurposeFromInput(input: "signup" | "login"): VerificationCodePurpose {
  return input === "signup" ? VerificationCodePurpose.SIGNUP : VerificationCodePurpose.LOGIN;
}

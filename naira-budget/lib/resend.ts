import { Resend } from "resend";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://orjar.app";

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL?.trim() || "hello@orjar.app";
export const FROM_NAME = process.env.RESEND_FROM_NAME?.trim() || "Orjar";
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;

let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

import { normalizeEmail } from "../auth/verification-code";

export function canAccessInviteByEmail(authEmail: string | null, inviteEmail: string): boolean {
  if (!authEmail) return false;
  return normalizeEmail(authEmail) === normalizeEmail(inviteEmail);
}


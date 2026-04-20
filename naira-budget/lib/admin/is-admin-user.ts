/**
 * Comma-separated Supabase user UUIDs in `ADMIN_USER_IDS`.
 * If unset or empty, no user is treated as admin (safe default).
 */
export function isAdminUserId(userId: string): boolean {
  const raw = process.env.ADMIN_USER_IDS?.trim();
  if (!raw) return false;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}

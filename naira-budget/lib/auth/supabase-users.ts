import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const found = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) {
      return found;
    }

    if (data.users.length < perPage) {
      return null;
    }
    page += 1;
  }
}

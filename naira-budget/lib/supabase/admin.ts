import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  adminClient = createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export function createAnonServerClient(): SupabaseClient {
  if (anonClient) return anonClient;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  anonClient = createClient(getSupabaseUrl(), anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return anonClient;
}

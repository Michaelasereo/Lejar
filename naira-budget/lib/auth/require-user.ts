import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null as null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, error: null as null };
}

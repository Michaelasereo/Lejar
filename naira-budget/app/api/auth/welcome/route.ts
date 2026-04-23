import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { safelySendEmail, sendWelcomeEmailIfFirstLogin } from "@/lib/email";

export async function POST() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const email = auth.user.email?.trim();
  if (!email) return NextResponse.json({ ok: true });

  const name =
    (auth.user.user_metadata?.full_name as string | undefined)?.trim() ||
    (auth.user.user_metadata?.name as string | undefined)?.trim() ||
    "there";

  await safelySendEmail(() =>
    sendWelcomeEmailIfFirstLogin({
      userId: auth.user.id,
      email,
      name,
    }),
  );

  return NextResponse.json({ ok: true });
}

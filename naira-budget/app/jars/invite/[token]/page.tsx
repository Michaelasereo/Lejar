import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { findAuthUserByEmail } from "@/lib/auth/supabase-users";
import { prisma } from "@/lib/prisma";

type Props = { params: { token: string } };

export default async function GroupInviteEntryPage({ params }: Props) {
  let invite: { email: string } | null = null;
  try {
    invite = await prisma.groupJarMember.findUnique({
      where: { inviteToken: params.token },
      select: { email: true },
    });
  } catch (error) {
    console.error("[jars/invite entry] failed to lookup invite", {
      token: params.token.slice(0, 6),
      error: error instanceof Error ? error.message : error,
    });
    redirect("/login");
  }

  if (!invite) {
    redirect("/login");
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const invitePath = `/app/jars/invite/${params.token}`;
  if (user) {
    redirect(invitePath);
  }

  const hasAccount = Boolean(await findAuthUserByEmail(invite.email).catch(() => null));
  const encodedRedirect = encodeURIComponent(invitePath);
  const encodedEmail = encodeURIComponent(invite.email);

  if (hasAccount) {
    redirect(`/login?email=${encodedEmail}&redirect=${encodedRedirect}`);
  }

  redirect(`/signup?email=${encodedEmail}&redirect=${encodedRedirect}`);
}

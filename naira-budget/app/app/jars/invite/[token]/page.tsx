import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { InviteActions } from "@/components/jars/invite-actions";

type Props = { params: { token: string } };

export default async function GroupJarInvitePage({ params }: Props) {
  const invite = await prisma.groupJarMember.findUnique({
    where: { inviteToken: params.token },
    include: { jar: true },
  });
  if (!invite) notFound();

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-lg border border-white/10 bg-[#111111] p-6">
      <p className="text-sm text-white/60">{invite.status === "PENDING" ? "Invite pending" : "Invite status"}</p>
      <h1 className="mt-2 text-2xl text-white">
        <span className="mr-2 text-3xl">{invite.jar.emoji}</span>
        {invite.jar.name}
      </h1>
      <p className="mt-2 text-sm text-white/50">Target: {invite.jar.targetAmount.toString()}</p>
      {!user ? (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-white/60">Join Orjar to accept this invite.</p>
          <Link href={`/signup?redirect=/app/jars/invite/${params.token}`} className="inline-block border border-accent bg-accent px-4 py-2 text-sm text-black">
            Sign up free
          </Link>
        </div>
      ) : (
        <InviteActions token={params.token} />
      )}
    </div>
  );
}

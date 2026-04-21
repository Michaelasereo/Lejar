import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { GroupJarDetailClient } from "@/components/jars/group-jar-detail-client";

type Props = { params: { id: string } };

export default async function GroupJarDetailPage({ params }: Props) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.groupJarMember.findFirst({
    where: { jarId: params.id, userId: user.id, status: "ACTIVE" },
  });
  if (!membership) notFound();

  const jar = await prisma.groupSavingsJar.findUnique({
    where: { id: params.id },
    include: {
      members: true,
      contributions: { orderBy: { date: "desc" } },
    },
  });
  if (!jar) notFound();

  return (
    <GroupJarDetailClient
      userId={user.id}
      jarId={jar.id}
      name={jar.name}
      emoji={jar.emoji}
      targetAmount={Number(jar.targetAmount.toString())}
      members={jar.members}
      contributions={jar.contributions}
    />
  );
}

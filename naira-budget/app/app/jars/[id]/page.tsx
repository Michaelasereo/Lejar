import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { JarDetailClient } from "@/components/jars/jar-detail-client";

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const jar = await prisma.savingsJar.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return {
    title: jar ? `${jar.name} — Jar` : "Jar",
  };
}

export default async function JarDetailPage({ params }: PageProps) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const jar = await prisma.savingsJar.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      contributions: { orderBy: { date: "desc" }, take: 80 },
    },
  });

  if (!jar) {
    notFound();
  }

  return (
    <JarDetailClient
      jar={{
        id: jar.id,
        name: jar.name,
        emoji: jar.emoji,
        color: jar.color,
        targetAmount: jar.targetAmount.toString(),
        savedAmount: jar.savedAmount.toString(),
        monthlyTarget: jar.monthlyTarget?.toString() ?? null,
        dueDate: jar.dueDate?.toISOString() ?? null,
        isCompleted: jar.isCompleted,
        isPinned: jar.isPinned,
        category: jar.category,
        notes: jar.notes,
      }}
      contributions={jar.contributions.map((c) => ({
        id: c.id,
        amount: c.amount.toString(),
        note: c.note,
        date: c.date.toISOString(),
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}

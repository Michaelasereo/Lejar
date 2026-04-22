import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Onboarding — Orjar",
  description: "Set up your income, rent, and buckets.",
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });

  if (settings?.isOnboarded) {
    redirect("/app/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
  );
}

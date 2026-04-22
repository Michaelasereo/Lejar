import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { resolveOnboardingStatus } from "@/lib/users/resolve-onboarding-status";

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

  const isOnboarded = await resolveOnboardingStatus(user.id);
  if (isOnboarded) {
    redirect("/app/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
  );
}

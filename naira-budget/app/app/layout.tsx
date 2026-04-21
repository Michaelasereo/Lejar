import { redirect } from "next/navigation";
import { isAdminUserId } from "@/lib/admin/is-admin-user";
import { createServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
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

  if (!settings?.isOnboarded) {
    redirect("/onboarding");
  }

  const showAdminNav = isAdminUserId(user.id);
  let pendingGroupInviteCount = 0;
  try {
    pendingGroupInviteCount = await prisma.groupJarMember.count({
      where: {
        status: "PENDING",
        OR: [
          { userId: user.id },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
    });
  } catch (error) {
    // Keep app pages available even if group-jar tables are not migrated yet.
    console.error("[app/layout] pending group invite count failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : error,
    });
  }

  return (
    <AppShell
      showAdminNav={showAdminNav}
      userEmail={user.email ?? ""}
      pendingGroupInviteCount={pendingGroupInviteCount}
    >
      {children}
    </AppShell>
  );
}

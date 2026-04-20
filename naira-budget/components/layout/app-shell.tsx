"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

interface AppShellProps {
  children: ReactNode;
  userEmail: string;
  showAdminNav?: boolean;
}

export function AppShell({ children, userEmail, showAdminNav = false }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar showAdminNav={showAdminNav} userEmail={userEmail} />
      <div className="flex min-h-screen flex-col bg-background md:ml-56">
        <TopBar userEmail={userEmail} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-16 md:px-8 md:pb-8 md:pt-6">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

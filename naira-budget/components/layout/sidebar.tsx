"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Landmark,
  LayoutDashboard,
  LineChart,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
};

function buildNavItems(showAdminNav: boolean): NavItem[] {
  const core: NavItem[] = [
    { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/app/income", label: "Buckets", icon: Wallet },
    { href: "/app/investments", label: "Investments", icon: TrendingUp },
    { href: "/app/expenses", label: "Expenses", icon: Receipt },
    { href: "/app/grocery", label: "Grocery", icon: ShoppingCart },
    { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/app/jars", label: "Savings Jars", icon: Landmark },
    { href: "/app/projection", label: "Projection", icon: LineChart },
  ];
  const tail: NavItem[] = [
    ...(showAdminNav ? [{ href: "/app/admin", label: "Admin", icon: Shield }] : []),
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];
  return [...core, ...tail];
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/app/dashboard") {
    return pathname === "/app/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  userEmail: string;
  showAdminNav?: boolean;
}

export function Sidebar({ userEmail, showAdminNav = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = buildNavItems(showAdminNav);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/5 bg-surface md:flex">
      <div className="border-b border-white/5 px-5 py-6">
        <Link href="/app/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-medium text-accent">₦B</span>
          <span className="text-sm font-medium tracking-tight text-foreground">
            Naira Budget
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4" aria-label="Main">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-3 rounded-none border-l-2 py-2.5 pl-3 text-sm transition-colors",
                active
                  ? "border-green-500 bg-white/5 text-foreground"
                  : "border-transparent text-white/40 hover:bg-white/[0.03] hover:text-white/70",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 px-4 py-4">
        <p className="truncate text-xs text-white/30" title={userEmail}>
          {userEmail}
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 text-left text-xs font-medium text-white/50 transition-colors hover:text-white/80"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

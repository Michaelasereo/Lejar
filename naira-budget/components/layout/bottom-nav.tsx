"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  LineChart,
  Landmark,
  MoreHorizontal,
  Receipt,
  Settings,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const PRIMARY: {
  href?: string;
  label: string;
  icon: typeof LayoutDashboard;
  mode?: "link" | "more";
}[] = [
  { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/app/income", label: "Buckets", icon: Wallet },
  { href: "/app/expenses", label: "Spend", icon: Receipt },
  { href: "/app/jars", label: "Jars", icon: Landmark },
  { mode: "more", label: "More", icon: MoreHorizontal },
];

const MORE_LINKS: { href: string; label: string; icon: typeof ShoppingCart }[] =
  [
    { href: "/app/grocery", label: "Grocery", icon: ShoppingCart },
    { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/app/investments", label: "Invest", icon: TrendingUp },
    { href: "/app/projection", label: "Projection", icon: LineChart },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/app/dashboard") {
    return pathname === "/app/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface BottomNavProps {
  pendingGroupInviteCount?: number;
}

export function BottomNav({ pendingGroupInviteCount = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function moreRelatedActive(): boolean {
    return MORE_LINKS.some((item) => isActivePath(pathname, item.href));
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-white/5 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Mobile primary"
      >
        {PRIMARY.map((item) => {
          if (item.mode === "more") {
            const dotActive = moreRelatedActive();
            return (
              <button
                key="more"
                type="button"
                onClick={() => setMoreOpen(true)}
                className="relative flex min-h-11 min-w-11 flex-col items-center justify-center"
                aria-label={item.label}
              >
                <span
                  className={cn(
                    "mb-0.5 h-1 w-1 rounded-full",
                    dotActive ? "bg-accent" : "bg-transparent",
                  )}
                  aria-hidden
                />
                <MoreHorizontal
                  className={cn(
                    "h-6 w-6",
                    dotActive ? "text-accent" : "text-white/40",
                  )}
                  strokeWidth={1.75}
                />
              </button>
            );
          }

          const href = item.href!;
          const active = isActivePath(pathname, href);
          const showInviteDot = href === "/app/jars" && pendingGroupInviteCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex min-h-11 min-w-11 flex-col items-center justify-center"
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
            >
              <span
                className={cn(
                  "mb-0.5 h-1 w-1 rounded-full",
                  active ? "bg-accent" : "bg-transparent",
                )}
                aria-hidden
              />
              <item.icon
                className={cn(
                  "h-6 w-6",
                  active ? "text-accent" : "text-white/40",
                )}
                strokeWidth={1.75}
              />
              {showInviteDot && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMoreOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
            <p className="mb-3 text-xs uppercase tracking-widest text-white/35">
              More
            </p>
            <ul className="space-y-1">
              {MORE_LINKS.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex min-h-12 items-center gap-3 px-3 text-sm transition-colors",
                        active
                          ? "bg-white/8 text-foreground"
                          : "text-white/55 hover:bg-white/[0.04] hover:text-white/85",
                      )}
                    >
                      <link.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

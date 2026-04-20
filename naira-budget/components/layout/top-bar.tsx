"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { addCalendarMonths, formatMonthLabel } from "@/lib/utils/month";

const TITLE_BY_PREFIX: { prefix: string; title: string }[] = [
  { prefix: "/app/dashboard", title: "Home" },
  { prefix: "/app/income", title: "Buckets" },
  { prefix: "/app/investments", title: "Investments" },
  { prefix: "/app/expenses", title: "Expenses" },
  { prefix: "/app/grocery", title: "Grocery" },
  { prefix: "/app/analytics", title: "Analytics" },
  { prefix: "/app/jars", title: "Savings jars" },
  { prefix: "/app/projection", title: "Projection" },
  { prefix: "/app/admin", title: "Admin" },
  { prefix: "/app/settings", title: "Settings" },
];

function pageTitle(pathname: string): string {
  const hit = TITLE_BY_PREFIX.find(
    (t) => pathname === t.prefix || pathname.startsWith(`${t.prefix}/`),
  );
  return hit?.title ?? "Naira Budget";
}

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "?";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

interface TopBarProps {
  userEmail: string;
}

export function TopBar({ userEmail }: TopBarProps) {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const setSelectedMonth = useAppStore((s) => s.setSelectedMonth);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-white/5 bg-surface md:sticky md:left-auto md:right-auto md:top-0">
      <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 md:px-6">
        <h1 className="truncate text-left text-base font-medium text-white/90 md:text-lg">
          {title}
        </h1>

        <div className="flex items-center justify-center gap-0.5 text-sm tabular-nums text-white/80">
          <button
            type="button"
            onClick={() =>
              setSelectedMonth(addCalendarMonths(selectedMonth, -1))
            }
            className="flex min-h-11 min-w-11 items-center justify-center text-white/50 transition-colors hover:text-white/90"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[9rem] text-center text-xs md:text-sm">
            {formatMonthLabel(selectedMonth)}
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedMonth(addCalendarMonths(selectedMonth, 1))
            }
            className="flex min-h-11 min-w-11 items-center justify-center text-white/50 transition-colors hover:text-white/90"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center text-white/40 transition-colors hover:text-white/70"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center bg-green-900 text-xs font-medium text-green-400"
            title={userEmail}
          >
            {initialsFromEmail(userEmail)}
          </div>
        </div>
      </div>
    </header>
  );
}

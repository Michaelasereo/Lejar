"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function DashboardFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-[1.02] md:hidden"
        aria-expanded={open}
        aria-label="Quick actions"
      >
        <Plus className="h-7 w-7" strokeWidth={2} />
      </button>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-background/70 md:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "fixed bottom-40 right-4 z-30 flex w-56 flex-col gap-0 border border-white/10 bg-[#111] py-2 shadow-xl transition-all md:hidden",
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible translate-y-2 opacity-0 pointer-events-none",
        )}
      >
        <Link
          href="/app/expenses"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5"
        >
          <Receipt className="h-4 w-4 text-accent" />
          Log expense
        </Link>
        <Link
          href="/app/investments"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5"
        >
          <TrendingUp className="h-4 w-4 text-accent" />
          Log investment
        </Link>
        <Link
          href="/app/grocery"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5"
        >
          <ShoppingCart className="h-4 w-4 text-accent" />
          Open grocery list
        </Link>
      </div>
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { MigrateRentTrigger } from "@/components/jars/migrate-rent-trigger";

export const metadata: Metadata = {
  title: "Savings jars — Naira Budget",
};

function toNum(v: { toString(): string }): number {
  return parseFloat(v.toString());
}

export default async function JarsPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const jars = await prisma.savingsJar.findMany({
    where: { userId: user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { contributions: true } },
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/30">Goals</p>
          <h1 className="mt-2 text-2xl font-medium text-foreground">Savings jars</h1>
          <p className="mt-2 max-w-xl text-sm text-white/45">
            Multiple targets — rent, gadgets, emergency fund — each with its own pace.
          </p>
        </div>
        <Link
          href="/app/jars/new"
          className="inline-flex min-h-11 items-center gap-2 border border-accent bg-accent/10 px-4 text-sm font-medium text-accent hover:bg-accent/15"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          New jar
        </Link>
      </div>

      <div className="mt-10 space-y-4">
        {jars.length === 0 ? (
          <p className="text-sm text-white/40">
            No jars yet. Create one to track a savings goal.
          </p>
        ) : (
          jars.map((j) => {
            const saved = toNum(j.savedAmount);
            const target = toNum(j.targetAmount);
            const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
            return (
              <Link
                key={j.id}
                href={`/app/jars/${j.id}`}
                className="block border border-white/10 bg-[#111111] p-5 transition-colors hover:border-white/20"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{j.emoji}</span>
                    <div>
                      <p className="font-medium text-white/90">{j.name}</p>
                      <p className="mt-1 text-xs text-white/35">
                        {j._count.contributions} contributions
                        {j.isPinned ? " · Pinned to Home" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums text-foreground">
                      {formatNaira(saved)} / {formatNaira(target)}
                    </p>
                    <p className="text-xs text-white/40">{pct}% funded</p>
                  </div>
                </div>
                <div className="mt-4 h-1 w-full bg-white/10">
                  <div
                    className={cn(
                      "h-1 transition-all",
                      pct >= 100 ? "animate-pulse bg-accent" : "bg-accent",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-10 border border-white/10 bg-black/30 p-4">
        <p className="text-sm text-white/60">
          Migrated from the legacy rent jar? <MigrateRentTrigger />
        </p>
      </div>
    </>
  );
}

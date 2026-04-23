"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { IconAction } from "@/components/ui/IconAction";
import { formatNaira } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

interface JarQuickContributeCardProps {
  jar: {
    id: string;
    emoji: string;
    name: string;
    savedAmount: number;
    targetAmount: number;
    contributionsCount: number;
    isPinned: boolean;
  };
}

export function JarQuickContributeCard({ jar }: JarQuickContributeCardProps) {
  const router = useRouter();
  const pct = jar.targetAmount > 0 ? Math.min(100, Math.round((jar.savedAmount / jar.targetAmount) * 100)) : 0;

  async function quickContribute() {
    const res = await fetch(`/api/savings-jars/${jar.id}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1000, note: "Quick add" }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(payload.error ?? "Could not add contribution");
    }
    toast.success("Added ₦1,000");
    router.refresh();
  }

  return (
    <div className="border border-white/10 bg-[#111111] p-5 transition-colors hover:border-white/20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/app/jars/${jar.id}`} className="flex items-center gap-3">
          <span className="text-2xl">{jar.emoji}</span>
          <div>
            <p className="font-medium text-white/90">{jar.name}</p>
            <p className="mt-1 text-xs text-white/35">
              {jar.contributionsCount} contributions
              {jar.isPinned ? " · Pinned to Home" : ""}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm tabular-nums text-foreground">
              {formatNaira(jar.savedAmount)} / {formatNaira(jar.targetAmount)}
            </p>
            <p className="text-xs text-white/40">{pct}% funded</p>
          </div>
          <IconAction
            onClick={quickContribute}
            className="min-h-9 min-w-9 border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
            icon={<Plus className="h-4 w-4" />}
            successIcon={<Plus className="h-4 w-4" />}
          />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/10">
        <div
          className={cn("h-1 bg-accent transition-all", pct >= 100 && "animate-pulse")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

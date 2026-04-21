"use client";

import Link from "next/link";
import { formatNaira } from "@/lib/utils/currency";

interface GroupJarCardProps {
  jar: {
    id: string;
    name: string;
    emoji: string;
    targetAmount: number;
    totalSaved: number;
    memberCount: number;
    isAdmin: boolean;
  };
}

export function GroupJarCard({ jar }: GroupJarCardProps) {
  const pct = jar.targetAmount > 0 ? Math.min(100, Math.round((jar.totalSaved / jar.targetAmount) * 100)) : 0;
  return (
    <Link href={`/app/jars/group/${jar.id}`} className="block border border-white/10 bg-[#111111] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white/90">
          <span className="mr-2 text-xl">{jar.emoji}</span>
          {jar.name}
        </p>
        <span className="text-[10px] uppercase text-blue-300">Group</span>
      </div>
      <p className="mt-2 text-xs text-white/50">
        {jar.isAdmin ? "Admin" : "Member"} · {jar.memberCount} members
      </p>
      <p className="mt-2 text-sm tabular-nums text-white/80">
        {formatNaira(jar.totalSaved)} of {formatNaira(jar.targetAmount)}
      </p>
      <div className="mt-2 h-1 w-full bg-white/10">
        <div className="h-1 bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

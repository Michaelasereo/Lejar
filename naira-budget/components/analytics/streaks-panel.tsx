"use client";

import { useMemo, useRef, useState } from "react";
import type { MilestoneType, StreakType } from "@prisma/client";
import type { StreakView } from "@/lib/utils/streaks";
import { formatNaira } from "@/lib/utils/currency";

type MilestoneRow = {
  id: string;
  type: MilestoneType;
  value: number | null;
  achievedAt: string | Date;
  isNew: boolean;
};

const STREAK_LABELS: Record<StreakType, string> = {
  MONTHLY_SAVINGS: "Monthly savings streak",
  MONTHLY_BUDGET: "Budget discipline streak",
  WEEKLY_LOGGING: "Weekly logging streak",
  MONTHLY_INVESTING: "Monthly investing streak",
};

const MILESTONE_LABELS: Partial<Record<MilestoneType, string>> = {
  NET_WORTH_500K: "Net worth reached ₦500k",
  NET_WORTH_1M: "Net worth reached ₦1M",
  NET_WORTH_5M: "Net worth reached ₦5M",
  NET_WORTH_10M: "Net worth reached ₦10M",
  SAVINGS_STREAK_3: "3-month savings streak",
  SAVINGS_STREAK_6: "6-month savings streak",
  SAVINGS_STREAK_12: "12-month savings streak",
  FIRST_INVESTMENT: "First investment",
  FIRST_TBILL: "First T-bill",
  BUDGET_RESPECTED_3: "3 months of budget discipline",
};

interface StreaksPanelProps {
  streaks: StreakView[];
  milestones: MilestoneRow[];
}

export function StreaksPanel({ streaks, milestones: initialMilestones }: StreaksPanelProps) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [selected, setSelected] = useState<MilestoneRow | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const bestStreak = streaks[0] ?? null;
  const activeStreaks = useMemo(() => streaks.filter((s) => s.currentCount > 0), [streaks]);

  async function markSeen(id: string) {
    await fetch(`/api/milestones/${id}/seen`, { method: "PATCH" });
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, isNew: false } : m)));
  }

  async function shareMilestone() {
    if (!selected || !cardRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: "#070707", scale: 2 });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], "milestone.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "Orjar Milestone", files: [file] });
      return;
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "orjar-milestone.png";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-6">
      <section className="border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs uppercase tracking-widest text-white/30">Best streak</p>
        {bestStreak ? (
          <>
            <p className="mt-2 text-xl font-medium text-white">{STREAK_LABELS[bestStreak.type]}</p>
            <p className="mt-1 text-sm text-accent">{bestStreak.currentCount} periods active</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/50">No streak yet. Start logging to begin.</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {(activeStreaks.length ? activeStreaks : streaks).map((streak) => (
          <div key={streak.id} className="border border-white/8 bg-[#111] p-4">
            <p className="text-sm text-white">{STREAK_LABELS[streak.type]}</p>
            <p className="mt-2 text-2xl font-semibold text-accent">{streak.currentCount}</p>
            <p className="text-xs text-white/40">Longest: {streak.longestCount}</p>
            {streak.isAtRisk ? (
              <p className="mt-2 text-xs text-amber-300">
                At risk - {streak.daysUntilReset ?? 0} day(s) to extend
              </p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="border border-white/10 bg-[#0d0d0d] p-4">
        <p className="text-xs uppercase tracking-widest text-white/30">Milestones</p>
        <div className="mt-3 space-y-2">
          {milestones.length === 0 ? (
            <p className="text-sm text-white/45">No milestones yet.</p>
          ) : (
            milestones.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelected(m);
                  if (m.isNew) void markSeen(m.id);
                }}
                className="flex w-full items-center justify-between border border-white/8 px-3 py-2 text-left hover:border-white/20"
              >
                <span className="text-sm text-white">{MILESTONE_LABELS[m.type] ?? m.type}</span>
                <span className="text-xs text-white/45">
                  {new Date(m.achievedAt).toLocaleDateString("en-NG")}
                  {m.isNew ? " • NEW" : ""}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      {selected ? (
        <section className="space-y-3 border border-white/10 bg-white/[0.02] p-4">
          <div ref={cardRef} className="border border-white/10 bg-black p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">Orjar</p>
            <p className="mt-2 text-xl font-medium text-white">
              {MILESTONE_LABELS[selected.type] ?? selected.type}
            </p>
            {selected.value ? (
              <p className="mt-1 text-sm text-accent">{formatNaira(selected.value)}</p>
            ) : null}
            <p className="mt-4 text-xs text-white/40">
              Achieved on {new Date(selected.achievedAt).toLocaleDateString("en-NG")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void shareMilestone()}
            className="min-h-10 border border-accent bg-accent px-4 text-sm text-black"
          >
            Share milestone
          </button>
        </section>
      ) : null}
    </div>
  );
}

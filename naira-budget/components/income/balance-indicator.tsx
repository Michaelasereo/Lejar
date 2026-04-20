"use client";

import { formatNaira } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

interface BalanceIndicatorProps {
  totalIncome: number;
  totalAllocated: number;
  remaining: number;
  dirty: boolean;
  canSave: boolean;
  onSave: () => void | Promise<void>;
}

export function BalanceIndicator({
  totalIncome,
  totalAllocated,
  remaining,
  dirty,
  canSave,
  onSave,
}: BalanceIndicatorProps) {
  const balanced = Math.abs(remaining) < 0.01;
  const tone = balanced
    ? "text-accent"
    : remaining > 0
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div
      className={cn(
        "fixed bottom-16 left-0 right-0 z-30 border-t border-white/10 bg-surface/95 px-4 py-3 backdrop-blur-sm md:static md:z-auto md:mt-10 md:rounded-none md:border md:border-white/10 md:bg-card md:px-4 md:py-3 md:backdrop-blur-none",
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={cn("text-sm font-medium", tone)}>
          <span className="text-white/60">
            {formatNaira(totalAllocated)} of {formatNaira(totalIncome)} allocated
          </span>
          <span className="mx-2 text-white/25">·</span>
          <span>
            {balanced ? "Balanced" : `${formatNaira(Math.abs(remaining))} ${remaining >= 0 ? "remaining" : "over"}`}
          </span>
        </p>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void onSave()}
          className={cn(
            "min-h-11 shrink-0 rounded-none border px-5 py-2.5 text-sm font-medium transition-colors",
            canSave
              ? "border-accent bg-accent text-accent-foreground hover:bg-accent/90"
              : "cursor-not-allowed border-white/10 bg-white/5 text-white/30",
          )}
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

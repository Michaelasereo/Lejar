"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { formatNaira } from "@/lib/utils/currency";

interface TbMaturityBannerProps {
  items: Array<{
    id: string;
    label: string;
    amount: number;
    maturityDate: Date;
  }>;
}

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function TbMaturityBanner({ items }: TbMaturityBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || items.length === 0) return null;

  const first = items[0]!;
  const days = daysUntil(first.maturityDate);

  return (
    <div className="mb-8 flex items-start justify-between gap-4 border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <p className="text-sm text-amber-200/90">
        <span className="font-medium text-amber-100">
          {formatNaira(first.amount)} T-bill
        </span>{" "}
        matures in {days} day{days === 1 ? "" : "s"} — mark as rolled over or
        withdrawn in Investments.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-200/60 transition-colors hover:text-amber-100"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

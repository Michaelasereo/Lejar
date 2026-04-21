"use client";

import { useState } from "react";
import Link from "next/link";
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
  const matured = days <= 0;

  return (
    <div className="mb-8 flex items-start justify-between gap-4 border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="text-sm text-amber-200/90">
        <p>
          <span className="font-medium text-amber-100">{first.label}</span>{" "}
          {matured
            ? `matured on ${first.maturityDate.toLocaleDateString("en-NG")}. Confirm your actual profit to add it to your portfolio.`
            : `matures in ${days} day${days === 1 ? "" : "s"}.`}
        </p>
        {matured && (
          <Link href="/app/investments" className="mt-1 inline-block text-xs text-accent">
            Confirm profit -&gt;
          </Link>
        )}
      </div>
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

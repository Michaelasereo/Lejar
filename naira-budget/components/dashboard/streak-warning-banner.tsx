"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface StreakWarningBannerProps {
  warning: { id: string; message: string };
}

export function StreakWarningBanner({ warning }: StreakWarningBannerProps) {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  async function dismissWarning() {
    setDismissing(true);
    try {
      const res = await fetch(`/api/streaks/warnings/${warning.id}/dismiss`, { method: "PATCH" });
      if (!res.ok) {
        toast.error("Could not dismiss warning");
        return;
      }
      setVisible(false);
    } finally {
      setDismissing(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="mt-4 flex items-start justify-between gap-3 border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-100">
      <p>{warning.message}</p>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/app/analytics?tab=streaks"
          className="text-xs text-amber-200/80 hover:text-amber-100"
        >
          View streaks
        </Link>
        <button
          type="button"
          onClick={() => void dismissWarning()}
          disabled={dismissing}
          className="text-xs text-amber-200/70 hover:text-amber-100 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

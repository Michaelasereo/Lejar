import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export const metadata: Metadata = {
  title: "Analytics — Naira Budget",
};

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/40">Loading analytics…</p>}>
      <AnalyticsView />
    </Suspense>
  );
}

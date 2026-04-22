"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SettingsPageData } from "@/lib/settings/get-settings-page-data";
import { formatNaira } from "@/lib/utils/currency";

interface SettingsClientProps {
  data: SettingsPageData;
}

export function SettingsClient({ data }: SettingsClientProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [showIncomeHistory, setShowIncomeHistory] = useState(false);
  const [targetSavingsRate, setTargetSavingsRate] = useState(data.targetSavingsRate);
  const [savingRate, setSavingRate] = useState(false);
  const [bucketDrafts, setBucketDrafts] = useState<Record<string, string>>(
    Object.fromEntries(data.buckets.map((bucket) => [bucket.id, bucket.percentage.toFixed(2)])),
  );
  const [savingBuckets, setSavingBuckets] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  async function saveTargetSavingsRate(nextValue: number) {
    setSavingRate(true);
    try {
      await fetch("/api/settings/target-savings-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSavingsRate: nextValue }),
      });
    } finally {
      setSavingRate(false);
    }
  }

  const bucketTotal = data.buckets.reduce(
    (sum, bucket) => sum + Number(bucketDrafts[bucket.id] ?? bucket.percentage),
    0,
  );
  const remainingPercentage = 100 - bucketTotal;
  const bucketOver = remainingPercentage < -0.01;

  async function saveBucketPercentages() {
    if (bucketOver) return;
    setSavingBuckets(true);
    try {
      await Promise.all(
        data.buckets.map((bucket) =>
          fetch(`/api/buckets/${bucket.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              percentage: Number(bucketDrafts[bucket.id] ?? bucket.percentage),
            }),
          }),
        ),
      );
      router.refresh();
    } finally {
      setSavingBuckets(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-white/30">Settings</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Preferences & account</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Manage your session and see how your workspace is configured.
        </p>
      </header>

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Account</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">Signed in as</h2>
        </div>
        <div className="space-y-3 px-4 py-4 text-sm">
          <div>
            <p className="text-xs text-white/40">Email</p>
            <p className="mt-1 break-all text-foreground">{data.email}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">User ID</p>
            <p className="mt-1 font-mono text-xs text-white/55">{data.userId}</p>
          </div>
          {data.settingsCreatedAt && (
            <div>
              <p className="text-xs text-white/40">Workspace since</p>
              <p className="mt-1 text-white/70">
                {data.settingsCreatedAt.toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Income</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">Current and history</h2>
        </div>
        <div className="space-y-3 px-4 py-4 text-sm text-white/65">
          {data.currentIncome.length === 0 ? (
            <p className="text-white/45">No active income sources.</p>
          ) : (
            data.currentIncome.map((income) => (
              <p key={income.id}>
                <span className="text-white">{income.label}</span>:{" "}
                <span className="tabular-nums">{formatNaira(income.amountMonthly)}/month</span>
              </p>
            ))
          )}
          <button
            type="button"
            onClick={() => setShowIncomeHistory((s) => !s)}
            className="text-accent underline-offset-2 hover:underline"
          >
            {showIncomeHistory ? "Hide income history" : "View income history"}
          </button>
          {showIncomeHistory ? (
            <div className="space-y-2 border-t border-white/10 pt-3">
              {data.incomeHistory.map((row) => (
                <div key={row.id} className={row.isCurrent ? "text-white" : "text-white/45"}>
                  <p>{row.label}</p>
                  <p className="text-xs tabular-nums">
                    {formatNaira(row.amountMonthly)}/month {row.rangeLabel}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Bucket percentages</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">Official split</h2>
        </div>
        <div className="space-y-3 px-4 py-4 text-sm text-white/65">
          <p className="text-white/50">
            Setting a percentage makes each bucket adapt to the selected month&apos;s income.
          </p>
          {data.buckets.map((bucket) => (
            <div key={bucket.id} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: bucket.color }}
                aria-hidden
              />
              <span className="flex-1 text-white">{bucket.name}</span>
              <input
                inputMode="decimal"
                value={bucketDrafts[bucket.id] ?? ""}
                onChange={(e) =>
                  setBucketDrafts((prev) => ({ ...prev, [bucket.id]: e.target.value }))
                }
                className="h-9 w-20 border border-white/15 bg-background px-2 text-right text-sm"
              />
              <span className="text-white/45">%</span>
            </div>
          ))}
          <p className={bucketOver ? "text-red-400" : "text-white/45"}>
            Total {bucketTotal.toFixed(2)}% · Remaining {remainingPercentage.toFixed(2)}%
          </p>
          <button
            type="button"
            disabled={savingBuckets || bucketOver}
            onClick={() => void saveBucketPercentages()}
            className="min-h-11 border border-accent bg-accent px-4 py-2 text-sm text-accent-foreground disabled:opacity-40"
          >
            {savingBuckets ? "Saving..." : "Save bucket percentages"}
          </button>
        </div>
      </section>

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Savings target</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">Monthly goal</h2>
        </div>
        <div className="px-4 py-4 text-sm text-white/65">
          <p className="mb-3">Set the savings rate used for monthly savings streaks.</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={80}
              step={1}
              value={targetSavingsRate}
              onChange={(e) => setTargetSavingsRate(Number(e.target.value))}
              onMouseUp={() => void saveTargetSavingsRate(targetSavingsRate)}
              onTouchEnd={() => void saveTargetSavingsRate(targetSavingsRate)}
              className="w-full"
            />
            <span className="w-12 text-right text-white">{targetSavingsRate}%</span>
          </div>
          <p className="mt-2 text-xs text-white/45">{savingRate ? "Saving…" : "Saved automatically"}</p>
        </div>
      </section>

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Budget setup</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">Onboarding</h2>
        </div>
        <div className="px-4 py-4 text-sm text-white/65">
          {data.isOnboarded ? (
            <p>
              <span className="inline-flex border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                Complete
              </span>
              <span className="mt-2 block">
                Income, buckets, and optional rent are saved. Adjust them anytime under{" "}
                <Link href="/app/income" className="text-accent underline-offset-2 hover:underline">
                  Income & buckets
                </Link>
                .
              </span>
            </p>
          ) : (
            <p>
              Finish setup on the{" "}
              <Link href="/onboarding" className="text-accent underline-offset-2 hover:underline">
                onboarding
              </Link>{" "}
              flow.
            </p>
          )}
        </div>
      </section>

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Regional</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">Currency</h2>
        </div>
        <div className="px-4 py-4 text-sm text-white/65">
          <p>
            All amounts are shown in <strong className="font-medium text-foreground">Nigerian Naira (NGN)</strong>{" "}
            with locale-aware formatting.
          </p>
        </div>
      </section>

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Session</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">Sign out</h2>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-white/55">
            Sign out on this device. You will need your email and password to sign in again.
          </p>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="mt-4 inline-flex min-h-11 items-center gap-2 border border-white/20 bg-transparent px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-white/35 hover:bg-white/[0.04] disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </section>

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Product</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">About</h2>
        </div>
        <div className="space-y-2 px-4 py-4 text-sm text-white/55">
          <p>Naira Budget — personal budgeting and planning for Nigeria-first use cases.</p>
          <p>
            <Link href="/" className="text-accent underline-offset-2 hover:underline">
              Marketing site
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SettingsPageData } from "@/lib/settings/get-settings-page-data";

interface SettingsClientProps {
  data: SettingsPageData;
}

export function SettingsClient({ data }: SettingsClientProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

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

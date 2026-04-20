"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contributionSchema } from "@/lib/validations/jar";
import type { z } from "zod";
import { formatNaira } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

type Contrib = {
  id: string;
  amount: string;
  note: string | null;
  date: string;
  createdAt: string;
};

export interface JarDetailClientProps {
  jar: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    targetAmount: string;
    savedAmount: string;
    monthlyTarget: string | null;
    dueDate: string | null;
    isCompleted: boolean;
    isPinned: boolean;
    category: string;
    notes: string | null;
  };
  contributions: Contrib[];
}

type ContribForm = z.infer<typeof contributionSchema>;

function toNum(s: string): number {
  return parseFloat(s);
}

export function JarDetailClient({ jar, contributions: initialContribs }: JarDetailClientProps) {
  const router = useRouter();
  const [contribs, setContribs] = useState(initialContribs);
  const [saved, setSaved] = useState(toNum(jar.savedAmount));
  const [target] = useState(toNum(jar.targetAmount));
  const [complete, setComplete] = useState(jar.isCompleted);
  const [pinned, setPinned] = useState(jar.isPinned);
  const celebrateRef = useRef(false);

  const percent = useMemo(
    () => (target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0),
    [saved, target],
  );

  const form = useForm<ContribForm>({
    resolver: zodResolver(contributionSchema),
    defaultValues: { amount: 1000, note: "" },
  });

  useEffect(() => {
    if (percent < 100) {
      celebrateRef.current = false;
    }
  }, [percent]);

  useEffect(() => {
    if (percent >= 100 && !celebrateRef.current) {
      celebrateRef.current = true;
      void import("canvas-confetti").then((c) => {
        c.default({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      });
    }
  }, [percent]);

  const r = 70;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;
  const ringClass = percent >= 100 ? "animate-pulse" : "";

  async function onAdd(v: ContribForm) {
    try {
      const res = await fetch(`/api/savings-jars/${jar.id}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: v.amount, note: v.note || null }),
      });
      const row = (await res.json()) as {
        id: string;
        amount: string;
        note: string | null;
        date: string;
        createdAt: string;
        error?: string;
      };
      if (!res.ok) throw new Error(row.error ?? "failed");
      setContribs((prev) => [
        {
          id: row.id,
          amount: row.amount,
          note: row.note,
          date: row.date,
          createdAt: row.createdAt,
        },
        ...prev,
      ]);
      setSaved((s) => s + v.amount);
      if (target > 0 && saved + v.amount >= target) {
        setComplete(true);
      }
      form.reset({ amount: 1000, note: "" });
      router.refresh();
      toast.success("Contribution added");
    } catch {
      toast.error("Could not add contribution");
    }
  }

  async function onDelete(contributionId: string) {
    try {
      const res = await fetch(
        `/api/savings-jars/${jar.id}/contributions/${contributionId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("failed");
      const removed = contribs.find((x) => x.id === contributionId);
      setContribs((prev) => prev.filter((x) => x.id !== contributionId));
      if (removed) {
        setSaved((s) => s - toNum(removed.amount));
      }
      setComplete(false);
      router.refresh();
      toast.success("Removed");
    } catch {
      toast.error("Could not remove");
    }
  }

  async function togglePin() {
    try {
      const next = !pinned;
      const res = await fetch(`/api/savings-jars/${jar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: next }),
      });
      if (!res.ok) throw new Error("failed");
      setPinned(next);
      toast.success(next ? "Pinned to Home" : "Unpinned");
      router.refresh();
    } catch {
      toast.error("Could not update");
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/app/jars"
          className="text-sm text-white/40 transition-colors hover:text-white/70"
        >
          ← All jars
        </Link>
        <button
          type="button"
          onClick={() => void togglePin()}
          className="min-h-11 border border-white/15 px-4 text-sm text-white/70 hover:border-white/25"
        >
          {pinned ? "Unpin from Home" : "Pin to Home"}
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div
          className={cn(
            "relative h-52 w-52",
            percent >= 100 && "drop-shadow-[0_0_20px_rgba(22,163,74,0.45)]",
          )}
        >
          <svg
            viewBox="0 0 160 160"
            className={cn("h-full w-full -rotate-90", ringClass)}
          >
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="10"
            />
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={jar.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              className="transition-[stroke-dasharray] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl">{jar.emoji}</span>
            <span className="mt-2 text-2xl font-medium tabular-nums text-foreground">
              {percent}%
            </span>
            <span className="text-xs text-white/40">funded</span>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-medium text-foreground">{jar.name}</h1>
        <p className="mt-2 text-sm text-white/50">
          {formatNaira(saved)} of {formatNaira(target)}
        </p>
        {complete || percent >= 100 ? (
          <p className="mt-3 text-sm font-medium text-accent">Goal complete</p>
        ) : null}
      </div>

      <section className="border border-white/10 bg-[#111111] p-6">
        <h2 className="text-sm font-medium text-white/80">Add contribution</h2>
        <form
          onSubmit={form.handleSubmit(onAdd)}
          className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <label className="block flex-1 text-sm text-white/60">
            Amount (₦)
            <input
              type="number"
              step="1"
              {...form.register("amount", { valueAsNumber: true })}
              className="mt-2 min-h-11 w-full border border-white/15 bg-black px-3 text-foreground"
            />
          </label>
          <label className="block flex-1 text-sm text-white/60">
            Note
            <input
              {...form.register("note")}
              className="mt-2 min-h-11 w-full border border-white/15 bg-black px-3 text-foreground"
            />
          </label>
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="min-h-11 shrink-0 bg-accent px-6 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40"
          >
            Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-white/30">
          Contributions
        </h2>
        <ul className="mt-4 divide-y divide-white/5 border border-white/10 bg-[#111111]">
          {contribs.length === 0 ? (
            <li className="px-4 py-6 text-sm text-white/40">None yet.</li>
          ) : (
            contribs.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <p className="tabular-nums text-foreground">
                    {formatNaira(toNum(row.amount))}
                  </p>
                  <p className="text-xs text-white/35">
                    {new Date(row.date).toLocaleString("en-NG")}
                  </p>
                  {row.note ? (
                    <p className="mt-1 text-xs text-white/50">{row.note}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void onDelete(row.id)}
                  className="text-xs text-red-400/90 hover:text-red-300"
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

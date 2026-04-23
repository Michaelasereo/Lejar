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
import { ContextMenu } from "@/components/ui/ContextMenu";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";

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
  const [name, setName] = useState(jar.name);
  const [emoji, setEmoji] = useState(jar.emoji);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(jar.name);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0 });
  const [deleteJarModalOpen, setDeleteJarModalOpen] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const celebrateRef = useRef(false);
  const EMOJIS = ["🏠", "🚗", "💻", "📱", "✈️", "📚", "💰", "💍", "🏥", "🎓", "🏦", "🛍️", "🎉", "🔒", "💼", "🌍"];

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

  async function patchJar(body: Record<string, unknown>) {
    const res = await fetch(`/api/savings-jars/${jar.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Could not update");
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 900);
    router.refresh();
  }

  async function deleteJar() {
    try {
      const res = await fetch(`/api/savings-jars/${jar.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete");
      toast.success("Jar deleted");
      setDeleteJarModalOpen(false);
      router.push("/app/jars");
      router.refresh();
    } catch {
      toast.error("Could not delete jar");
    }
  }

  async function saveName(nextName: string) {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === name) {
      setDraftName(name);
      setEditingName(false);
      return;
    }
    try {
      await patchJar({ name: trimmed });
      setName(trimmed);
      setDraftName(trimmed);
      setEditingName(false);
    } catch {
      toast.error("Could not update name");
    }
  }

  async function saveEmoji(nextEmoji: string) {
    try {
      setEmoji(nextEmoji);
      setShowEmojiPicker(false);
      await patchJar({ emoji: nextEmoji });
    } catch {
      toast.error("Could not update emoji");
      setEmoji(jar.emoji);
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
            percent >= 100 && "drop-shadow-[0_0_20px_rgba(124,99,253,0.45)]",
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
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="rounded-full p-2 text-3xl hover:bg-white/5"
            >
              {emoji}
            </button>
            <span className="mt-2 text-2xl font-medium tabular-nums text-foreground">
              {percent}%
            </span>
            <span className="text-xs text-white/40">funded</span>
          </div>
        </div>
        {showEmojiPicker && (
          <div className="mt-3 grid grid-cols-4 gap-2 border border-white/10 bg-[#1a1a1a] p-2">
            {EMOJIS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => void saveEmoji(value)}
                className={`h-10 w-10 ${emoji === value ? "border border-white/20 bg-white/10" : ""}`}
              >
                {value}
              </button>
            ))}
          </div>
        )}
        <div
          className="mt-6 flex items-center gap-2"
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ open: true, x: e.clientX, y: e.clientY });
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            pressTimer.current = window.setTimeout(() => {
              setMenu({ open: true, x: t.clientX, y: t.clientY });
            }, 500);
          }}
          onTouchEnd={() => {
            if (pressTimer.current) window.clearTimeout(pressTimer.current);
          }}
        >
          {editingName ? (
            <div>
              <input
                value={draftName}
                maxLength={50}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => void saveName(draftName)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName(draftName);
                  if (e.key === "Escape") {
                    setDraftName(name);
                    setEditingName(false);
                  }
                }}
                autoFocus
                className="border-b border-white/30 bg-transparent text-2xl font-medium text-foreground outline-none"
              />
              <p className="text-[10px] text-white/20">{draftName.length}/50</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-2xl font-medium text-foreground"
            >
              {name} <span className="text-sm text-white/30">✎</span>
            </button>
          )}
          {savedFlash && <span className="text-xs text-white/30">Saved</span>}
        </div>
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
      <ContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        items={[
          { id: "name", label: "Edit name", onSelect: () => setEditingName(true) },
          { id: "emoji", label: "Change emoji", onSelect: () => setShowEmojiPicker(true) },
          {
            id: "details",
            label: "Edit jar details",
            onSelect: () =>
              toast.message("Use the existing jar controls for target, notes, and pin settings."),
          },
          {
            id: "delete",
            label: "Delete jar",
            danger: true,
            onSelect: () => setDeleteJarModalOpen(true),
          },
        ]}
      />
      <ConfirmActionModal
        open={deleteJarModalOpen}
        title="Delete this jar permanently?"
        description="All saved contributions in this jar will be removed."
        confirmLabel="Delete jar"
        onCancel={() => setDeleteJarModalOpen(false)}
        onConfirm={() => void deleteJar()}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const EMOJIS = ["🏠", "🚗", "💻", "📱", "✈️", "📚", "💰", "💍", "🏥", "🎓", "🏦", "🛍️", "🎉", "🔒", "💼", "🌍"];

export function NewGroupJarForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏦");
  const [targetAmount, setTargetAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState("#16a34a");
  const [notes, setNotes] = useState("");
  const [emails, setEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(targetAmount.replace(/,/g, ""));
    if (!name.trim() || !Number.isFinite(target) || target <= 0) {
      toast.error("Enter jar name and valid target");
      return;
    }
    const inviteEmails = emails.split(",").map((v) => v.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      const res = await fetch("/api/group-jars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          emoji,
          targetAmount: target,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          color,
          notes: notes.trim() || undefined,
          inviteEmails,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !j.id) {
        toast.error(j.error ?? "Could not create group jar");
        return;
      }
      toast.success("Group jar created");
      router.push(`/app/jars/group/${j.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto mt-8 max-w-xl space-y-4 border border-white/10 bg-[#111111] p-6">
      <div className="grid grid-cols-8 gap-2">
        {EMOJIS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setEmoji(value)}
            className={`h-10 border ${emoji === value ? "border-white/50 bg-white/10" : "border-white/10"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jar name" className="min-h-11 w-full border border-white/15 bg-black px-3" />
      <input inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Target amount (₦)" className="min-h-11 w-full border border-white/15 bg-black px-3" />
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="min-h-11 w-full border border-white/15 bg-black px-3" />
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-full border border-white/15 bg-black" />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={3} className="w-full border border-white/15 bg-black px-3 py-2" />
      <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="Invite emails (comma separated)" className="min-h-11 w-full border border-white/15 bg-black px-3" />
      <button type="submit" disabled={submitting} className="min-h-11 w-full bg-accent text-black disabled:opacity-50">
        {submitting ? "Creating..." : "Create group jar"}
      </button>
    </form>
  );
}

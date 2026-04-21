"use client";

import { useState } from "react";
import { toast } from "sonner";

interface GroupContributionFormProps {
  jarId: string;
  onSaved: () => void;
}

export function GroupContributionForm({ jarId, onSaved }: GroupContributionFormProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid contribution amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/group-jars/${jarId}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not log contribution");
        return;
      }
      setAmount("");
      setNote("");
      toast.success("Contribution logged");
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3 border border-white/10 bg-[#111111] p-4">
      <p className="text-sm font-medium text-white/80">Add your contribution</p>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (₦)"
        className="min-h-11 w-full border border-white/15 bg-black px-3 text-sm"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="min-h-11 w-full border border-white/15 bg-black px-3 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 w-full border border-accent bg-accent px-4 text-sm font-medium text-black disabled:opacity-50"
      >
        {submitting ? "Logging..." : "Log contribution"}
      </button>
    </form>
  );
}

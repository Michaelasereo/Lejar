"use client";

import { useState } from "react";
import { toast } from "sonner";

interface InviteMemberFormProps {
  jarId: string;
  onInvited: () => void;
}

export function InviteMemberForm({ jarId, onInvited }: InviteMemberFormProps) {
  const [emails, setEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsedEmails = emails
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (parsedEmails.length === 0) {
      toast.error("Enter at least one email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/group-jars/${jarId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: parsedEmails }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Could not send invite");
        return;
      }
      setEmails("");
      toast.success("Invites sent");
      onInvited();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2 border border-white/10 bg-[#111111] p-4">
      <p className="text-sm text-white/80">Invite more members</p>
      <input
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="email1@example.com, email2@example.com"
        className="min-h-11 w-full border border-white/15 bg-black px-3 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 border border-white/15 px-4 text-sm text-white/80 disabled:opacity-50"
      >
        {submitting ? "Sending..." : "Send invites"}
      </button>
    </form>
  );
}

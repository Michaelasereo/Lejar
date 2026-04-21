"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface InviteActionsProps {
  token: string;
}

export function InviteActions({ token }: InviteActionsProps) {
  const router = useRouter();

  async function accept() {
    const res = await fetch(`/api/group-jars/invite/${token}`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof j.error === "string" ? j.error : "Could not accept invite");
      return;
    }
    toast.success("You joined the group jar");
    router.push(`/app/jars/group/${j.jarId ?? ""}`);
    router.refresh();
  }

  async function decline() {
    const res = await fetch(`/api/group-jars/invite/${token}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not decline invite");
      return;
    }
    toast.success("Invite declined");
    router.push("/app/dashboard");
  }

  return (
    <div className="mt-6 flex gap-2">
      <button type="button" onClick={() => void accept()} className="min-h-11 border border-accent bg-accent px-4 text-sm text-black">
        Accept invite
      </button>
      <button type="button" onClick={() => void decline()} className="min-h-11 border border-white/15 px-4 text-sm text-white/70">
        Decline
      </button>
    </div>
  );
}

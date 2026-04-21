"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GroupJarMember, GroupJarContribution } from "@prisma/client";
import { GroupJarMemberList } from "@/components/jars/GroupJarMemberList";
import { GroupContributionForm } from "@/components/jars/GroupContributionForm";
import { InviteMemberForm } from "@/components/jars/InviteMemberForm";
import { formatNaira } from "@/lib/utils/currency";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { toast } from "sonner";

interface Props {
  userId: string;
  jarId: string;
  name: string;
  emoji: string;
  targetAmount: number;
  members: GroupJarMember[];
  contributions: GroupJarContribution[];
}

export function GroupJarDetailClient({
  userId,
  jarId,
  name,
  emoji,
  targetAmount,
  members,
  contributions,
}: Props) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(name);
  const [emojiValue, setEmojiValue] = useState(emoji);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0 });
  const pressTimer = useRef<number | null>(null);
  const EMOJIS = ["🏠", "🚗", "💻", "📱", "✈️", "📚", "💰", "💍", "🏥", "🎓", "🏦", "🛍️", "🎉", "🔒", "💼", "🌍"];
  const totalSaved = contributions.reduce((sum, c) => sum + Number(c.amount.toString()), 0);
  const memberRows = members.map((member) => ({
    ...member,
    contributed: contributions
      .filter((c) => c.memberId === member.id)
      .reduce((sum, c) => sum + Number(c.amount.toString()), 0),
  }));
  const isAdmin = members.some((m) => m.userId === userId && m.role === "ADMIN" && m.status === "ACTIVE");

  async function patchGroupJar(body: Record<string, unknown>) {
    const res = await fetch(`/api/group-jars/${jarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Could not update");
    router.refresh();
  }

  async function deleteGroupJar() {
    if (!isAdmin) return;
    if (!confirm("Delete this group jar for all members?")) return;
    try {
      const res = await fetch(`/api/group-jars/${jarId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Could not delete");
      }
      toast.success("Group jar deleted");
      router.push("/app/jars");
      router.refresh();
    } catch {
      toast.error("Could not delete group jar");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-blue-300">Group</p>
        <div
          className="mt-2 flex items-center gap-2"
          onContextMenu={(e) => {
            if (!isAdmin) return;
            e.preventDefault();
            setMenu({ open: true, x: e.clientX, y: e.clientY });
          }}
          onTouchStart={(e) => {
            if (!isAdmin) return;
            const t = e.touches[0];
            pressTimer.current = window.setTimeout(() => {
              setMenu({ open: true, x: t.clientX, y: t.clientY });
            }, 500);
          }}
          onTouchEnd={() => {
            if (pressTimer.current) window.clearTimeout(pressTimer.current);
          }}
        >
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => isAdmin && setShowEmojiPicker((v) => !v)}
            className="text-2xl disabled:cursor-default"
          >
            {emojiValue}
          </button>
          {editingName ? (
            <input
              value={draftName}
              maxLength={50}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={async () => {
                if (!isAdmin) return;
                const trimmed = draftName.trim();
                if (trimmed && trimmed !== nameValue) {
                  await patchGroupJar({ name: trimmed });
                  setNameValue(trimmed);
                }
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const trimmed = draftName.trim();
                  if (trimmed && trimmed !== nameValue) void patchGroupJar({ name: trimmed });
                  setNameValue(trimmed || nameValue);
                  setEditingName(false);
                }
                if (e.key === "Escape") {
                  setDraftName(nameValue);
                  setEditingName(false);
                }
              }}
              autoFocus
              className="border-b border-white/30 bg-transparent text-2xl font-medium text-foreground outline-none"
            />
          ) : (
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => isAdmin && setEditingName(true)}
              className="text-2xl font-medium text-foreground disabled:cursor-default"
            >
              {nameValue} {isAdmin ? <span className="text-sm text-white/30">✎</span> : null}
            </button>
          )}
        </div>
        {showEmojiPicker && isAdmin && (
          <div className="mt-2 grid grid-cols-4 gap-2 border border-white/10 bg-[#1a1a1a] p-2">
            {EMOJIS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={async () => {
                  setEmojiValue(value);
                  setShowEmojiPicker(false);
                  try {
                    await patchGroupJar({ emoji: value });
                  } catch {
                    toast.error("Could not update emoji");
                  }
                }}
                className={`h-10 w-10 ${emojiValue === value ? "border border-white/20 bg-white/10" : ""}`}
              >
                {value}
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-white/50">
          {formatNaira(totalSaved)} saved of {formatNaira(targetAmount)} target
        </p>
      </header>

      <GroupJarMemberList members={memberRows} targetAmount={targetAmount} />
      <GroupContributionForm jarId={jarId} onSaved={() => router.refresh()} />
      {isAdmin && <InviteMemberForm jarId={jarId} onInvited={() => router.refresh()} />}
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
            onSelect: () => toast.message("Use admin controls to update group jar settings."),
          },
          { id: "delete", label: "Delete jar", danger: true, onSelect: () => void deleteGroupJar() },
        ]}
      />
    </div>
  );
}

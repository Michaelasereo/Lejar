import { formatNaira } from "@/lib/utils/currency";

interface GroupJarMemberListProps {
  members: Array<{
    id: string;
    email: string;
    displayName: string | null;
    role: "ADMIN" | "MEMBER";
    status: "PENDING" | "ACTIVE" | "DECLINED" | "REMOVED";
    contributed: number;
  }>;
  targetAmount: number;
}

export function GroupJarMemberList({ members, targetAmount }: GroupJarMemberListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => {
        const pct = targetAmount > 0 ? Math.round((member.contributed / targetAmount) * 100) : 0;
        return (
          <div key={member.id} className="border border-white/10 bg-[#111111] p-3">
            <p className="text-sm text-white/90">
              {member.displayName || member.email}{" "}
              {member.role === "ADMIN" ? <span className="text-[10px] text-blue-300">ADMIN</span> : null}
            </p>
            <p className="text-xs text-white/45">
              {member.status === "PENDING" ? "Pending invite" : member.status}
            </p>
            <p className="mt-1 text-xs tabular-nums text-white/70">
              {formatNaira(member.contributed)} · {pct}% of target
            </p>
          </div>
        );
      })}
    </div>
  );
}

import { Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/EmailLayout";
import { EmailButton } from "@/emails/components/EmailButton";
import { EmailDivider } from "@/emails/components/EmailDivider";

interface GroupJarInviteEmailProps {
  inviterName: string;
  jarName: string;
  jarEmoji: string;
  targetAmount: string;
  dueDate?: string;
  memberCount: number;
  notes?: string;
  inviteUrl: string;
}

export function GroupJarInviteEmail(props: GroupJarInviteEmailProps) {
  const {
    inviterName,
    jarName,
    jarEmoji,
    targetAmount,
    dueDate,
    memberCount,
    notes,
    inviteUrl,
  } = props;

  return (
    <EmailLayout previewText={`${inviterName} invited you to save together on Orjar`}>
      <Text style={heading}>{inviterName} invited you to a group savings goal</Text>
      <Section style={card}>
        <Text style={emoji}>{jarEmoji}</Text>
        <Text style={jarNameStyle}>{jarName}</Text>
        <Text style={meta}>Target: {targetAmount}</Text>
        {dueDate ? <Text style={meta}>Due: {dueDate}</Text> : null}
        <Text style={meta}>
          Saving together: {memberCount} {memberCount === 1 ? "person" : "people"}
        </Text>
        {notes ? (
          <>
            <Hr style={{ borderColor: "#e8e8e8", margin: "12px 0" }} />
            <Text style={notesStyle}>"{notes}"</Text>
          </>
        ) : null}
      </Section>
      <EmailButton href={inviteUrl}>Accept invite</EmailButton>
      <EmailDivider />
      <Text style={small}>Not expecting this? Ignore this message safely.</Text>
    </EmailLayout>
  );
}

const heading = { fontSize: "15px", fontWeight: "600", margin: "0 0 12px", color: "#141414" };
const card = { backgroundColor: "#f6f4ff", border: "1px solid #dad3ff", borderRadius: "10px", padding: "18px", marginBottom: "16px", textAlign: "center" as const };
const emoji = { fontSize: "28px", margin: "0 0 6px" };
const jarNameStyle = { fontSize: "18px", fontWeight: "700", margin: "0 0 8px", color: "#141414" };
const meta = { fontSize: "13px", margin: "0 0 4px", color: "#505050" };
const notesStyle = { fontSize: "13px", margin: "0", color: "#666", fontStyle: "italic" };
const small = { fontSize: "12px", margin: "0", color: "#999" };

export default function GroupJarInviteEmailPreview() {
  return (
    <GroupJarInviteEmail
      inviterName="Asere"
      jarName="Q4 Family Trip"
      jarEmoji="✈️"
      targetAmount="₦800,000"
      dueDate="December 2026"
      memberCount={4}
      notes="Let us lock this in early."
      inviteUrl="https://orjar.app/app/jars/invite/test"
    />
  );
}

import { Section, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/EmailLayout";
import { EmailButton } from "@/emails/components/EmailButton";
import { EmailDivider } from "@/emails/components/EmailDivider";
import { APP_URL } from "@/lib/resend";

interface StreakAtRiskEmailProps {
  name: string;
  streakCount: number;
  streakType: string;
  daysLeft: number;
  actionUrl: string;
}

export function StreakAtRiskEmail({
  name,
  streakCount,
  streakType,
  daysLeft,
  actionUrl,
}: StreakAtRiskEmailProps) {
  return (
    <EmailLayout previewText={`Your ${streakCount}-month streak ends in ${daysLeft} days`}>
      <Text style={title}>Do not break your streak, {name} 🔥</Text>
      <Text style={copy}>
        You are {daysLeft} {daysLeft === 1 ? "day" : "days"} away from losing your{" "}
        {streakCount}-month {streakType} streak.
      </Text>
      <Section style={card}>
        <Text style={count}>{streakCount} months</Text>
        <Text style={meta}>
          {streakType} streak - ends in {daysLeft} {daysLeft === 1 ? "day" : "days"}
        </Text>
      </Section>
      <EmailButton href={actionUrl}>Keep my streak</EmailButton>
      <EmailDivider />
      <Text style={small}>
        You receive this reminder once per month when a streak is at risk.{" "}
        <a href={`${APP_URL}/app/settings`} style={{ color: "#999" }}>
          Manage notifications
        </a>
      </Text>
    </EmailLayout>
  );
}

const title = { margin: "0 0 10px", fontSize: "15px", color: "#151515", fontWeight: "600" };
const copy = { margin: "0 0 12px", fontSize: "14px", color: "#555", lineHeight: "1.6" };
const card = { backgroundColor: "#fff8e8", border: "1px solid #f0d58a", borderRadius: "10px", padding: "16px", textAlign: "center" as const, marginBottom: "12px" };
const count = { fontSize: "28px", fontWeight: "700", margin: "0 0 4px", color: "#1a1a1a" };
const meta = { margin: "0", fontSize: "12px", color: "#8a8a8a" };
const small = { margin: "0", fontSize: "12px", color: "#999" };

export default function StreakAtRiskEmailPreview() {
  return (
    <StreakAtRiskEmail
      name="Opeyemi"
      streakCount={4}
      streakType="savings"
      daysLeft={2}
      actionUrl="https://orjar.app/app/expenses"
    />
  );
}

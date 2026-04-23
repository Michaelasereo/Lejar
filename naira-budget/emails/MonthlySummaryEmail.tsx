import { Section, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/EmailLayout";
import { EmailButton } from "@/emails/components/EmailButton";

interface MonthlySummaryEmailProps {
  name: string;
  month: string;
  totalIncome: string;
  totalSaved: string;
  totalSpent: string;
  savingsRate: string;
  netWorth: string;
  netWorthChange: string;
  netWorthChangePositive: boolean;
  topSpendCategory: string;
  topSpendAmount: string;
  streakCount?: number;
  streakType?: string;
  dashboardUrl: string;
}

export function MonthlySummaryEmail(props: MonthlySummaryEmailProps) {
  return (
    <EmailLayout previewText={`Your ${props.month} summary - ${props.savingsRate} saved`}>
      <Text style={title}>{props.month} in review, {props.name}</Text>
      <Section style={statCard}>
        <Text style={label}>Saved</Text>
        <Text style={valueAccent}>{props.totalSaved}</Text>
        <Text style={meta}>{props.savingsRate} of {props.totalIncome}</Text>
      </Section>
      <Section style={statCardMuted}>
        <Text style={label}>Spent</Text>
        <Text style={valueDark}>{props.totalSpent}</Text>
      </Section>
      <Section style={netCard}>
        <Text style={label}>Net worth: {props.netWorth}</Text>
        <Text style={props.netWorthChangePositive ? up : down}>
          {props.netWorthChangePositive ? "↑" : "↓"} {props.netWorthChange}
        </Text>
      </Section>
      <Text style={meta}>
        Top spend: {props.topSpendCategory} ({props.topSpendAmount})
      </Text>
      {props.streakCount ? (
        <Text style={meta}>
          Streak: {props.streakCount} month {props.streakType ?? "savings"} streak
        </Text>
      ) : null}
      <EmailButton href={props.dashboardUrl}>View full report</EmailButton>
    </EmailLayout>
  );
}

const title = { fontSize: "15px", margin: "0 0 14px", fontWeight: "600", color: "#141414" };
const statCard = { backgroundColor: "#f6f4ff", border: "1px solid #dad3ff", borderRadius: "10px", padding: "14px", marginBottom: "10px" };
const statCardMuted = { backgroundColor: "#fafafa", border: "1px solid #ebebeb", borderRadius: "10px", padding: "14px", marginBottom: "10px" };
const netCard = { backgroundColor: "#ffffff", border: "1px solid #ebebeb", borderRadius: "10px", padding: "14px", marginBottom: "10px" };
const label = { fontSize: "12px", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 4px", color: "#8a8a8a" };
const valueAccent = { fontSize: "22px", margin: "0", fontWeight: "700", color: "#7C63FD" };
const valueDark = { fontSize: "22px", margin: "0", fontWeight: "700", color: "#1a1a1a" };
const meta = { fontSize: "13px", margin: "0 0 8px", color: "#555" };
const up = { fontSize: "13px", margin: "0", color: "#7C63FD", fontWeight: "600" };
const down = { fontSize: "13px", margin: "0", color: "#dc2626", fontWeight: "600" };

export default function MonthlySummaryEmailPreview() {
  return (
    <MonthlySummaryEmail
      name="Opeyemi"
      month="April 2026"
      totalIncome="₦800,000"
      totalSaved="₦448,000"
      totalSpent="₦187,000"
      savingsRate="56%"
      netWorth="₦2,340,000"
      netWorthChange="₦448,000"
      netWorthChangePositive
      topSpendCategory="Food"
      topSpendAmount="₦120,000"
      streakCount={4}
      streakType="savings"
      dashboardUrl="https://orjar.app/app/analytics"
    />
  );
}

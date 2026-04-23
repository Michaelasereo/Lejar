import { Section, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/EmailLayout";
import { EmailButton } from "@/emails/components/EmailButton";
import { EmailDivider } from "@/emails/components/EmailDivider";

interface TBillMaturityEmailProps {
  name: string;
  tbillLabel: string;
  amountInvested: string;
  expectedReturn: string;
  totalExpected: string;
  maturityDate: string;
  confirmUrl: string;
}

export function TBillMaturityEmail({
  name,
  tbillLabel,
  amountInvested,
  expectedReturn,
  totalExpected,
  maturityDate,
  confirmUrl,
}: TBillMaturityEmailProps) {
  return (
    <EmailLayout previewText={`Your ${tbillLabel} has matured - confirm profit`}>
      <Text style={title}>Your T-bill has matured, {name}</Text>
      <Section style={card}>
        <Text style={label}>{tbillLabel}</Text>
        <Text style={line}>Invested: {amountInvested}</Text>
        <Text style={line}>Expected profit: {expectedReturn}</Text>
        <Text style={total}>Total expected: {totalExpected}</Text>
      </Section>
      <Text style={meta}>Matured on {maturityDate}</Text>
      <EmailButton href={confirmUrl}>Confirm profit</EmailButton>
      <EmailDivider />
      <Text style={small}>
        You can confirm later from your investments page at any time.
      </Text>
    </EmailLayout>
  );
}

const title = { fontSize: "15px", fontWeight: "600", margin: "0 0 12px", color: "#151515" };
const card = { backgroundColor: "#f6f4ff", border: "1px solid #dad3ff", borderRadius: "10px", padding: "16px", marginBottom: "12px" };
const label = { margin: "0 0 8px", fontSize: "15px", fontWeight: "600", color: "#151515" };
const line = { margin: "0 0 4px", fontSize: "13px", color: "#535353" };
const total = { margin: "8px 0 0", fontSize: "16px", fontWeight: "700", color: "#151515" };
const meta = { margin: "0 0 12px", fontSize: "12px", color: "#888" };
const small = { margin: "0", fontSize: "12px", color: "#999" };

export default function TBillMaturityEmailPreview() {
  return (
    <TBillMaturityEmail
      name="Opeyemi"
      tbillLabel="FGN 364-day"
      amountInvested="₦250,000"
      expectedReturn="₦36,000"
      totalExpected="₦286,000"
      maturityDate="April 23, 2026"
      confirmUrl="https://orjar.app/app/investments"
    />
  );
}

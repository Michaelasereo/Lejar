import { Section, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/EmailLayout";
import { EmailDivider } from "@/emails/components/EmailDivider";

interface VerificationCodeEmailProps {
  code: string;
  name?: string;
  expiresInMinutes: number;
}

export function VerificationCodeEmail({
  code,
  name,
  expiresInMinutes,
}: VerificationCodeEmailProps) {
  return (
    <EmailLayout previewText={`${code} is your Orjar verification code`}>
      <Text style={greeting}>{name ? `Hi ${name},` : "Hi there,"}</Text>
      <Text style={copy}>Here is your verification code for Orjar:</Text>
      <Section style={codeWrap}>
        <Text style={codeStyle}>{code}</Text>
      </Section>
      <Text style={meta}>
        Expires in {expiresInMinutes} minutes. Do not share this code with anyone.
      </Text>
      <EmailDivider />
      <Text style={finePrint}>
        If you did not request this, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}

const greeting = { fontSize: "15px", margin: "0 0 6px", color: "#151515", fontWeight: "600" };
const copy = { fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px", color: "#4a4a4a" };
const codeWrap = { textAlign: "center" as const, marginBottom: "16px" };
const codeStyle = {
  display: "inline-block",
  margin: "0",
  padding: "14px 26px",
  fontFamily: "monospace",
  fontSize: "32px",
  letterSpacing: "0.2em",
  backgroundColor: "#f3f1ff",
  border: "1px solid #7C63FD",
  borderRadius: "10px",
  color: "#111111",
  fontWeight: "700",
};
const meta = { textAlign: "center" as const, fontSize: "12px", color: "#8a8a8a", margin: "0" };
const finePrint = { fontSize: "12px", color: "#9e9e9e", margin: "0" };

export default function VerificationCodeEmailPreview() {
  return (
    <VerificationCodeEmail
      code="482 917"
      name="Opeyemi"
      expiresInMinutes={10}
    />
  );
}

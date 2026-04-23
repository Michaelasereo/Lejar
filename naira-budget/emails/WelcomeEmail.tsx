import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/EmailLayout";
import { EmailButton } from "@/emails/components/EmailButton";
import { EmailDivider } from "@/emails/components/EmailDivider";
import { APP_URL } from "@/lib/resend";

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <EmailLayout previewText="Your budget is ready - let us build wealth intentionally">
      <Text style={title}>Welcome to Orjar, {name}.</Text>
      <Text style={copy}>
        Thank you for joining us.
      </Text>
      <Text style={copy}>
        We built Orjar because too many smart people work hard, earn well, and still
        feel unsure about where their money is going. I wanted to build a product
        that gives clarity, structure, and confidence, without complexity.
      </Text>
      <Text style={copy}>
        My advice is simple: start small, stay consistent, and keep your numbers
        visible. If you do that, your financial decisions become easier every month.
      </Text>
      <Text style={copy}>
        I am glad you are here. Let us build real wealth intentionally.
      </Text>
      <EmailButton href={`${APP_URL}/app/dashboard`}>Go to my dashboard</EmailButton>
      <EmailDivider />
      <Text style={signatureName}>Asere Opeyemi-Michael</Text>
      <Text style={signatureRole}>CEO Orjar finance</Text>
      <Text style={small}>
        Built for Nigerian professionals. No bank connection. No funds held.
      </Text>
    </EmailLayout>
  );
}

const title = { fontSize: "16px", fontWeight: "600", color: "#121212", margin: "0 0 10px" };
const copy = { fontSize: "14px", lineHeight: "1.6", color: "#555", margin: "0 0 14px" };
const signatureName = { fontSize: "13px", color: "#1f1f1f", margin: "0 0 2px", fontWeight: "600" };
const signatureRole = { fontSize: "12px", color: "#6b6b6b", margin: "0 0 10px" };
const small = { fontSize: "12px", color: "#999", margin: "0" };

export default function WelcomeEmailPreview() {
  return <WelcomeEmail name="Opeyemi" />;
}

import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { APP_URL } from "@/lib/resend";

interface EmailLayoutProps {
  previewText: string;
  children: ReactNode;
}

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                    <Img
                      src={`${APP_URL}/Orjar-logo.svg`}
                      width="128"
                      height="128"
                      alt="Orjar"
                      style={{ display: "inline-block", verticalAlign: "middle" }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Section style={content}>{children}</Section>
          <Section style={footer}>
            <Text style={footerLead}>
              Orjar - Budget your naira. Build real wealth.
            </Text>
            <Text style={footerSub}>
              No real money is held. This is a planning tool only.{" "}
              <Link href={`${APP_URL}/app/settings`} style={footerLink}>
                Manage email preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailDivider() {
  return <Hr style={{ borderColor: "#e8e8e8", margin: "20px 0" }} />;
}

const body = {
  backgroundColor: "#f5f5f8",
  margin: "0",
  padding: "20px 0",
  fontFamily: "Inter, Arial, sans-serif",
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
};

const header = {
  backgroundColor: "#0a0a0a",
  borderRadius: "12px 12px 0 0",
  padding: "6px 10px",
};

const content = {
  backgroundColor: "#ffffff",
  padding: "28px",
};

const footer = {
  backgroundColor: "#fafafa",
  borderTop: "1px solid #ececec",
  borderRadius: "0 0 12px 12px",
  padding: "18px 28px",
};

const footerLead = {
  margin: "0 0 6px",
  fontSize: "12px",
  lineHeight: "18px",
  color: "#9b9b9b",
};

const footerSub = {
  margin: "0",
  fontSize: "11px",
  lineHeight: "17px",
  color: "#b3b3b3",
};

const footerLink = {
  color: "#8f8f8f",
  textDecoration: "underline",
};

import type { ReactNode } from "react";
import { Link } from "@react-email/components";

interface EmailButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function EmailButton({
  href,
  children,
  variant = "primary",
}: EmailButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <table width="100%" cellPadding={0} cellSpacing={0}>
      <tbody>
        <tr>
          <td align="center" style={{ padding: "8px 0" }}>
            <Link
              href={href}
              style={{
                display: "inline-block",
                borderRadius: "8px",
                padding: "12px 28px",
                backgroundColor: isPrimary ? "#7C63FD" : "transparent",
                color: isPrimary ? "#ffffff" : "#7C63FD",
                border: isPrimary ? "none" : "1px solid #7C63FD",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              {children}
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

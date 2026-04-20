import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Naira Budget",
  description: "Sign in to Naira Budget.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
